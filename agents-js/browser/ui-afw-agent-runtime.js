import { GoogleGenAI } from 'https://esm.run/@google/genai';
import { Agent } from './agents.mjs';
import {
  DEFAULT_BROWSER_SYSTEM_INSTRUCTION,
  createBrowserToolset,
  createBrowserAgent,
} from './bootstrap.mjs';
import { executeWithRetry } from './retry.mjs';
import { createAfwHostTools } from './ui-afw-agent-tools.js';
import { buildAfwSystemPrompt } from './ui-afw-routing.js';

const runtimeState = {
  cacheKey: '',
  agent: null,
  tools: null,
  toolset: null,
};

function enforceNoApproval(agent) {
  if (!agent || typeof agent !== 'object') return agent;
  agent.approvalPolicy = 'never';
  agent.approvalTimeoutMs = 1_000;
  return agent;
}

function normalizeBaseUrl(url) {
  const raw = String(url || '').trim() || 'https://api.openai.com/v1';
  return raw.replace(/\/+$/, '');
}

function makeCacheKey(config) {
  const provider = config && config.provider === 'openai' ? 'openai' : 'gemini';
  const model = String((config && config.model) || '').trim();
  const baseUrl = provider === 'openai' ? normalizeBaseUrl(config && config.baseUrl) : '';
  const apiKey = String((config && config.apiKey) || '').trim();
  return `${provider}|${model}|${baseUrl}|${apiKey.slice(0, 8)}|${apiKey.length}`;
}

function mapHistoryToOpenAiMessages(history = [], systemPrompt = '') {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  for (const msg of history) {
    if (!msg || !msg.role) continue;
    const role = String(msg.role);
    if (role === 'user' || role === 'system') {
      messages.push({ role, content: String(msg.content || '') });
      continue;
    }
    if (role === 'assistant') {
      const item = { role: 'assistant', content: msg.content == null ? null : String(msg.content) };
      if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        item.tool_calls = msg.tool_calls.map((tc) => ({
          id: String(tc.id || ''),
          type: 'function',
          function: {
            name: String(tc.name || ''),
            arguments: JSON.stringify(tc.arguments || {}),
          },
        }));
      }
      messages.push(item);
      continue;
    }
    if (role === 'tool') {
      messages.push({
        role: 'tool',
        tool_call_id: String(msg.tool_call_id || ''),
        content: String(msg.content || ''),
      });
    }
  }
  return messages;
}

function toOpenAiTools(tools = []) {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: String(tool.name || ''),
      description: String(tool.description || ''),
      parameters: tool.parameters || { type: 'object', properties: {} },
    },
  }));
}

function mergeTools(browserTools = [], hostTools = []) {
  const merged = [];
  const seen = new Set();
  for (const tool of (Array.isArray(hostTools) ? hostTools : [])) {
    if (!tool || !tool.name || seen.has(tool.name)) continue;
    seen.add(tool.name);
    merged.push(tool);
  }
  for (const tool of (Array.isArray(browserTools) ? browserTools : [])) {
    if (!tool || !tool.name || seen.has(tool.name)) continue;
    seen.add(tool.name);
    merged.push(tool);
  }
  return merged;
}

async function ensureMergedTools() {
  if (!runtimeState.toolset) {
    runtimeState.toolset = createBrowserToolset();
  }
  const ready = await runtimeState.toolset.ensureToolsReady({ includeMcp: true });
  const browserTools = ready && Array.isArray(ready.tools) ? ready.tools : [];
  const hostTools = createAfwHostTools();
  return mergeTools(browserTools, hostTools);
}

function createOpenAiLlm({ modelName, apiKey, baseUrl, tools = [] }) {
  const endpoint = `${normalizeBaseUrl(baseUrl)}/chat/completions`;
  const toolDefs = Array.isArray(tools) && tools.length > 0 ? toOpenAiTools(tools) : null;

  return {
    async chat(systemPrompt, history) {
      const payload = {
        model: String(modelName || 'gpt-5'),
        messages: mapHistoryToOpenAiMessages(history, systemPrompt || ''),
        ...(toolDefs ? { tools: toolDefs } : null),
      };

      const response = await executeWithRetry(async () => {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.text();
          const err = new Error(`OpenAI HTTP ${res.status}: ${body.slice(0, 300)}`);
          err.status = res.status;
          throw err;
        }
        return await res.json();
      }, { maxRetries: 2, baseDelay: 250, maxWaitSeconds: 5 });

      const message = response && response.choices && response.choices[0] && response.choices[0].message
        ? response.choices[0].message
        : null;
      const usage = response && response.usage ? response.usage : undefined;
      const toolCalls = message && Array.isArray(message.tool_calls) ? message.tool_calls : [];
      return {
        content: message && typeof message.content === 'string' ? message.content : '',
        tool_calls: toolCalls.map((tc) => ({
          id: String(tc.id || ''),
          name: String(tc.function && tc.function.name ? tc.function.name : ''),
          arguments: (() => {
            try {
              return JSON.parse(tc.function && tc.function.arguments ? tc.function.arguments : '{}');
            } catch {
              return {};
            }
          })(),
        })),
        usage,
      };
    },
  };
}

async function ensureAgent(config) {
  const cfg = config && typeof config === 'object' ? config : {};
  const provider = cfg.provider === 'openai' ? 'openai' : 'gemini';
  const apiKey = String(cfg.apiKey || '').trim();
  const modelName = String(cfg.model || '').trim() || (provider === 'openai' ? 'gpt-5' : 'gemini-2.5-pro');

  if (!apiKey) throw new Error(`[${provider}] API Key 为空，请在 Settings 保存后再试。`);

  const nextKey = makeCacheKey({ ...cfg, provider, model: modelName });
  const tools = await ensureMergedTools();
  const systemPrompt = buildAfwSystemPrompt({
    provider,
    modelName,
    basePrompt: DEFAULT_BROWSER_SYSTEM_INSTRUCTION,
  });
  runtimeState.tools = tools;
  if (runtimeState.agent && runtimeState.cacheKey === nextKey) return enforceNoApproval(runtimeState.agent);

  if (provider === 'gemini') {
    const built = await createBrowserAgent({
      apiKey,
      modelName,
      tools,
      systemPrompt,
      AgentClass: Agent,
      GoogleGenAI,
    });
    runtimeState.agent = enforceNoApproval(built.agent);
    runtimeState.cacheKey = nextKey;
    return runtimeState.agent;
  }

  const llm = createOpenAiLlm({
    modelName,
    apiKey,
    baseUrl: cfg.baseUrl,
    tools,
  });
  llm.modelName = modelName;
  runtimeState.agent = enforceNoApproval(new Agent({
    llm,
    tools,
    systemPrompt,
  }));
  runtimeState.cacheKey = nextKey;
  return runtimeState.agent;
}

export async function runAfwAgentTurn({ config, message, onEvent } = {}) {
  const prompt = String(message || '').trim();
  if (!prompt) throw new Error('消息不能为空。');
  const agent = await ensureAgent(config);
  let finalText = '';
  let streamText = '';

  try {
    for await (const ev of agent.runAsyncIterator(prompt)) {
      if (ev && ev.type === 'approval.required' && ev.callId && typeof agent.provideUserInput === 'function') {
        try { agent.provideUserInput(String(ev.callId), 'Approve'); } catch {}
      }
      if (typeof onEvent === 'function') onEvent(ev);
      if (!ev || !ev.type) continue;
      if (ev.type === 'response.chunk') streamText += String(ev.delta || '');
      if (ev.type === 'turn.completed') finalText = String(ev.finalResponse || streamText || '').trim();
      if (ev.type === 'error') throw new Error(ev.message || 'Agent 运行失败');
    }
  } catch (error) {
    const msg = String(error && error.message || error || '');
    const isGemini400 = /gemini/i.test(msg) && (/\b400\b/.test(msg) || /invalid[_\s-]?argument/i.test(msg));
    if (isGemini400) {
      const wrapped = new Error(msg);
      wrapped.displayMessage = [
        '[Gemini] Request rejected (400).',
        '请检查：1) model 是否可用（建议先试 gemini-2.5-pro）；',
        '2) API key 是否有该模型权限；3) 工具参数/历史是否触发 INVALID_ARGUMENT。',
      ].join(' ');
      throw wrapped;
    }
    throw error;
  }
  return finalText || streamText || '(空响应)';
}

export function stopAfwAgentTurn(reason = 'user_stop') {
  const agent = runtimeState.agent;
  if (!agent || typeof agent.stop !== 'function') return false;
  try {
    agent.stop(String(reason || 'user_stop'));
    return true;
  } catch {
    return false;
  }
}
