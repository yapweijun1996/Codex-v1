export { DEFAULT_BROWSER_SYSTEM_INSTRUCTION } from './system-instruction.mjs';
import {
    convertHistory,
    formatToolsForGemini,
    extractFunctionCalls,
    extractText,
    extractUsage,
} from './gemini-helpers.mjs';
import { filterManifestByConfig, getAgentsConfigFromGlobal, isMcpEnabled } from './toolset-config.mjs';
import { executeWithRetry } from './retry.mjs';
import { getBrowserControlTools } from './control-tools.mjs';
import { createBrowserRagTools } from './rag/browser-rag-runtime.js';
import { isGeminiClientBadRequest, emitFallbackFromChat } from './gemini-stream-fallback.mjs';
import { loadMcpHttpToolsFromConfig } from './mcp-http-tools.mjs';
export function createBrowserGeminiLlm(model, { enableStreaming = true, tools = [] } = {}) {
    if (!model) throw new Error('Model not initialized');
    const toolsForGemini = Array.isArray(tools) && tools.length > 0 ? formatToolsForGemini(tools) : undefined;
    let toolCallSeq = 0;
    const llm = {
        async chat(systemPrompt, history) {
            const contents = convertHistory(history);
            const config = systemPrompt ? { systemInstruction: systemPrompt } : {};
            const resultSource = await executeWithRetry(
                () => model.generateContent({
                    contents,
                    ...config,
                    ...(toolsForGemini ? { config: { tools: toolsForGemini } } : null),
                }),
                { maxRetries: 2, baseDelay: 250, maxWaitSeconds: 5 }
            );
            const response = (resultSource && resultSource.response) ? resultSource.response : resultSource;
            const output = {
                content: extractText(response),
                tool_calls: [],
                usage: extractUsage(response),
            };
            const functionCalls = extractFunctionCalls(response);
            if (functionCalls.length > 0) {
                output.tool_calls = functionCalls.map((fc, index) => ({
                    id: (fc && typeof fc.id === 'string' && fc.id) ? String(fc.id) : `call_${Date.now()}_${toolCallSeq++}`,
                    name: fc.name,
                    arguments: fc.args,
                    thought_signature: fc.thoughtSignature,
                }));
                output.content = null;
            }
            return output;
        },
    };

    if (enableStreaming) {
        llm.chatStream = async function* (systemPrompt, history) {
            const contents = convertHistory(history);
            const config = systemPrompt ? { systemInstruction: systemPrompt } : {};
            try {
                const result = await executeWithRetry(
                    () => model.generateContentStream({
                        contents,
                        ...config,
                        ...(toolsForGemini ? { config: { tools: toolsForGemini } } : null),
                    }),
                    { maxRetries: 2, baseDelay: 250, maxWaitSeconds: 5 }
                );
                for await (const chunk of result) {
                    const response = (chunk && chunk.response) ? chunk.response : chunk;
                    const chunkText = extractText(response) || '';
                    if (chunkText) {
                        yield { type: 'text', delta: chunkText };
                    }
                    const functionCalls = extractFunctionCalls(response);
                    if (functionCalls.length > 0) {
                        yield {
                            type: 'tool_calls',
                            tool_calls: functionCalls.map((fc, index) => ({
                                id: (fc && typeof fc.id === 'string' && fc.id) ? String(fc.id) : `call_${Date.now()}_${toolCallSeq++}`,
                                name: fc.name,
                                arguments: fc.args,
                                thought_signature: fc.thoughtSignature,
                            })),
                        };
                    }
                }
            } catch (error) {
                // Some Gemini preview model/request combinations reject streamGenerateContent with 400.
                // Fallback to non-streaming to keep AFW usable.
                if (!isGeminiClientBadRequest(error)) throw error;
                yield* emitFallbackFromChat(llm, systemPrompt, history);
            }
        };
    }
    return llm;
}
export { formatToolsForGemini };
export { loadMcpHttpToolsFromConfig };
export function getExternalMcpConfigFromGlobal(globalObj = globalThis) {
    const cfg = globalObj && globalObj.EXTERNAL_MCP_CONFIG;
    return (cfg && typeof cfg === 'object') ? cfg : null;
}
export function createBrowserToolset({
    manifestUrl = './skills-manifest.json',
    fetchImpl = fetch,
    getMcpConfig = () => getExternalMcpConfigFromGlobal(globalThis),
    getAgentsConfig = () => getAgentsConfigFromGlobal(globalThis),
} = {}) {
    let toolsCache = null;
    let manifestCache = null;
    let mcpToolsCache = null;
    let ragToolsCache = null;
    const toolIndex = new Map();
    const moduleCache = new Map();
    async function fetchManifest() {
        if (manifestCache) return manifestCache;
        const response = await fetchImpl(manifestUrl);
        if (!response.ok) throw new Error('Failed to load skills-manifest.json. Run build:browser first.');
        const raw = await response.json();
        const cfg = getAgentsConfig() || {};
        manifestCache = filterManifestByConfig(raw, cfg);
        return manifestCache;
    }
    async function importSkillModule(modulePath) {
        if (moduleCache.has(modulePath)) return moduleCache.get(modulePath);
        const resolved = new URL(modulePath, import.meta.url).href;
        const mod = await import(resolved);
        moduleCache.set(modulePath, mod);
        return mod;
    }
    async function resolveToolImpl(toolName) {
        const entry = toolIndex.get(toolName);
        if (!entry || !entry.modulePath) {
            throw new Error(`Tool not found in manifest: ${toolName}`);
        }
        const mod = await importSkillModule(entry.modulePath);
        const defs = mod && (mod.default || mod.tools);
        if (!Array.isArray(defs)) {
            throw new Error(`Invalid tools module export for ${toolName} (${entry.modulePath})`);
        }
        const tool = defs.find(t => t && t.name === toolName);
        if (!tool || typeof tool.func !== 'function') {
            throw new Error(`Tool implementation missing: ${toolName} (${entry.modulePath})`);
        }
        return tool;
    }
    async function buildNativeTools(manifest) {
        toolIndex.clear();
        const tools = [];
        for (const skill of (Array.isArray(manifest) ? manifest : [])) {
            if (!skill || !skill.toolsModule || !Array.isArray(skill.tools)) continue;
            for (const t of skill.tools) {
                if (!t || !t.name || !t.parameters) continue;
                toolIndex.set(t.name, { modulePath: skill.toolsModule });
                tools.push({
                    name: t.name,
                    description: t.description || '',
                    parameters: t.parameters,
                    func: async (args) => {
                        const impl = await resolveToolImpl(t.name);
                        return await impl.func(args);
                    }
                });
            }
        }
        return tools;
    }

    async function loadMcpTools() {
        if (mcpToolsCache) return mcpToolsCache;
        const cfg2 = getAgentsConfig() || {};
        if (!isMcpEnabled(cfg2)) {
            mcpToolsCache = [];
            return mcpToolsCache;
        }
        const cfg = getMcpConfig();
        if (!cfg) {
            mcpToolsCache = [];
            return mcpToolsCache;
        }
        mcpToolsCache = await loadMcpHttpToolsFromConfig(cfg, { fetchImpl });
        return mcpToolsCache;
    }
    async function loadRagTools(manifest) {
        if (ragToolsCache) return ragToolsCache;
        ragToolsCache = await createBrowserRagTools({ manifest, getAgentsConfig });
        return ragToolsCache;
    }
    async function ensureToolsReady({ includeMcp = true } = {}) {
        if (toolsCache) {
            return { tools: toolsCache, manifest: manifestCache, mcpTools: mcpToolsCache || [], ragTools: ragToolsCache || [] };
        }
        const manifest = await fetchManifest();
        const tools = await buildNativeTools(manifest);
        const cfg = getAgentsConfig() || {};
        if (includeMcp && isMcpEnabled(cfg)) {
            try {
                const mcpTools = await loadMcpTools();
                for (const t of mcpTools) tools.push(t);
            } catch {
                // no-op
            }
        }
        try {
            const ragTools = await loadRagTools(manifest);
            for (const t of ragTools) tools.push(t);
        } catch {
            // no-op
        }
        for (const t of getBrowserControlTools()) tools.push(t);
        toolsCache = tools;
        return { tools, manifest, mcpTools: mcpToolsCache || [], ragTools: ragToolsCache || [] };
    }
    return {
        fetchManifest,
        ensureToolsReady,
        loadMcpTools,
    };
}
export async function createBrowserAgent({
    apiKey,
    modelName,
    tools,
    systemPrompt,
    AgentClass,
    GoogleGenAI,
} = {}) {
    if (!apiKey || typeof apiKey !== 'string') throw new Error('Missing apiKey');
    if (!modelName || typeof modelName !== 'string') throw new Error('Missing modelName');
    if (!AgentClass) throw new Error('Missing AgentClass');
    if (!GoogleGenAI) throw new Error('Missing GoogleGenAI');

    const genAI = new GoogleGenAI({ apiKey });

    const cfg = getAgentsConfigFromGlobal(globalThis) || {};
    const enableStreaming = (cfg.llm && typeof cfg.llm.enableStreaming === 'boolean') ? cfg.llm.enableStreaming : true;
    const model = {
        generateContent: (args) => genAI.models.generateContent({
            model: modelName,
            ...args,
        }),
        generateContentStream: (args) => genAI.models.generateContentStream({
            model: modelName,
            ...args,
        }),
    };
    const llm = createBrowserGeminiLlm(model, { enableStreaming, tools });
    llm.modelName = modelName;
    const agent = new AgentClass({ llm, tools, systemPrompt });
    return { agent, model, llm };
}
