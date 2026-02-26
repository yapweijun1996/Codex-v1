const { Agent } = require('./agents');
const { GeminiLLM } = require('./gemini-adapter');
const { SkillManager } = require('./skill-manager');
const { getBuiltInTools } = require('./utils/built-in-tools');
const { DEFAULT_SYSTEM_PROMPT } = require('./utils/constants');
const { resolveMcpServers } = require('./utils/mcp-config-resolver');
const { getAgentConfig } = require('./utils/config');
const { createRagSearchService } = require('./utils/rag/rag-search-service');
const path = require('path');

const CORE_TOOL_NAMES = new Set([
    'run_command',
    'apply_patch',
    'list_available_skills',
    'read_skill_documentation',
]);


/**
 * Create a configured Agent instance
 * @param {Object} options
 * @param {string} [options.modelName="gemini-2.5-flash"] - Gemini model to use
 * @param {string} [options.skillsDir] - Path to skills directory (defaults to ./skills)
 * @param {string} [options.baseSystemPrompt] - Base system prompt
 * @param {number} [options.maxTurns] - Max reasoning steps per run
 * @param {object} [options.compaction] - History compaction settings
 * @param {number} [options.maxProtectedRecentMessages] - Cap protected recent messages
 * @param {object} [options.toolOutputLimits] - Tool output guard limits (string/array/object)
 * @param {object} [options.identity] - Agent identity { id, tenantId, role }
 * @param {object} [options.riskProfile] - Agent risk profile { tier }
 * @returns {Object} { agent, skillManager, tools }
 */
function buildAgentBundle({
    modelName,
    baseSystemPrompt,
    skillManager,
    snapshot,
    maxTurns,
    compaction,
    maxProtectedRecentMessages,
    toolOutputLimits,
    identity,
    riskProfile,
}) {
    const resolvedConfig = getAgentConfig();
    const ragConfig = (resolvedConfig && resolvedConfig.agent && resolvedConfig.agent.rag)
        ? resolvedConfig.agent.rag
        : {};
    const ragService = createRagSearchService({
        ragConfig,
        skillsDir: skillManager.skillsDir,
    });

    // 1. Combine all tools with deduplication
    // Built-in tools take priority
    const builtInTools = getBuiltInTools(skillManager, { ragService });
    const skillTools = skillManager.getTools();

    // Deduplication logic with source-aware warnings.
    // - Built-in tools MUST take priority.
    // - Known core tool name collisions (e.g. skill_manager skill) are expected; keep logs quiet.
    const toolRegistry = {};
    const toolSource = {}; // toolName -> 'built-in' | 'skill'

    for (const tool of builtInTools) {
        if (!tool || !tool.name) continue;
        if (!toolRegistry[tool.name]) {
            toolRegistry[tool.name] = tool;
            toolSource[tool.name] = 'built-in';
        } else {
            console.warn(`[AgentFactory] Duplicate built-in tool ignored: ${tool.name}`);
        }
    }

    for (const tool of skillTools) {
        if (!tool || !tool.name) continue;
        if (!toolRegistry[tool.name]) {
            toolRegistry[tool.name] = tool;
            toolSource[tool.name] = 'skill';
            continue;
        }

        const existingSource = toolSource[tool.name] || 'unknown';
        const isExpectedCoreCollision =
            CORE_TOOL_NAMES.has(tool.name) && existingSource === 'built-in';

        if (isExpectedCoreCollision) {
            // Silent: keep built-in implementation and avoid log noise.
            continue;
        }

        console.warn(`[AgentFactory] Duplicate tool ignored: ${tool.name}`);
    }

    const allTools = Object.values(toolRegistry);

    console.log(`[AgentFactory] Total tools available: ${allTools.length} (Deduplicated)`);
    console.log(`  - Built-in tools: ${builtInTools.length}`);
    console.log(`  - Unique skill tools: ${allTools.length - builtInTools.length}`);

    // 2. Initialize LLM
    const gemini = new GeminiLLM({
        modelName: modelName,
        tools: allTools
    });

    // 3. Create Agent
    // Note: We inject a compact skill catalog only (no full SKILL.md) to avoid context overflow.
    const memoryHint = allTools.some((tool) => {
        if (!tool || typeof tool.name !== 'string') return false;
        return tool.name.startsWith('memory__') || tool.name === 'memory_search' || tool.name === 'kb_search';
    })
        ? '\n\nMemory tools are available. For factual/company/domain queries, you MUST call kb_search or memory_search first. Only use web tools (e.g. searxng_query/read_url) after local memory is insufficient.'
        : '';
    const systemPrompt = `${baseSystemPrompt}${skillManager.getSystemPromptAddition()}${memoryHint}`;
    const agent = new Agent({
        llm: gemini,
        tools: allTools,
        systemPrompt,
        snapshot,
        maxTurns,
        compaction,
        maxProtectedRecentMessages,
        toolOutputLimits,
        identity,
        riskProfile,
        ragConfig,
        ragService,
        skillsDir: skillManager.skillsDir,
    });

    return {
        agent,
        skillManager,
        tools: allTools
    };
}

function createAgent(options = {}) {
    const {
        modelName = "gemini-2.5-flash",
        skillsDir = path.join(__dirname, 'skills'),
        catalogLimit = 80,
        baseSystemPrompt = DEFAULT_SYSTEM_PROMPT,
        snapshot,
        maxTurns,
        compaction,
        maxProtectedRecentMessages,
        toolOutputLimits,
        identity,
        riskProfile,
    } = options;

    // 1. Initialize Skill Manager
    const skillManager = new SkillManager(skillsDir, { catalogLimit });
    skillManager.loadSkills(); // Initial load

    return buildAgentBundle({
        modelName,
        baseSystemPrompt,
        skillManager,
        snapshot,
        maxTurns,
        compaction,
        maxProtectedRecentMessages,
        toolOutputLimits,
        identity,
        riskProfile,
    });
}

/**
 * Async variant of createAgent for ESM-first tools loading in Node.
 *
 * @param {Object} options
 * @param {string} [options.modelName="gemini-2.5-flash"] - Gemini model to use
 * @param {string} [options.skillsDir] - Path to skills directory (defaults to ./skills)
 * @param {number} [options.catalogLimit=80] - Max skills to include in the compact catalog
 * @param {string} [options.baseSystemPrompt] - Base system prompt
 * @param {boolean} [options.preferEsmTools=true] - Prefer loading `tools.mjs` when present
 * @param {number} [options.maxTurns] - Max reasoning steps per run
 * @param {object} [options.compaction] - History compaction settings
 * @param {number} [options.maxProtectedRecentMessages] - Cap protected recent messages
 * @param {object} [options.toolOutputLimits] - Tool output guard limits (string/array/object)
 * @param {object} [options.identity] - Agent identity { id, tenantId, role }
 * @param {object} [options.riskProfile] - Agent risk profile { tier }
 * @returns {Promise<Object>} { agent, skillManager, tools }
 */
async function createAgentAsync(options = {}) {
    const {
        modelName = "gemini-2.5-flash",
        skillsDir = path.join(__dirname, 'skills'),
        catalogLimit = 80,
        baseSystemPrompt = DEFAULT_SYSTEM_PROMPT,
        preferEsmTools = true,
        externalMcpUrls,
        mcpConfigJson,
        mcpConfigPath,
        snapshot,
        quiet = false,
        maxTurns,
        compaction,
        maxProtectedRecentMessages,
        toolOutputLimits,
        identity,
        riskProfile,
    } = options;

    const skillManager = new SkillManager(skillsDir, { catalogLimit });
    await skillManager.loadSkillsAsync({ preferEsmTools, quiet });

    const { combinedServers } = resolveMcpServers({
        mcpConfigJson,
        mcpConfigPath,
        externalMcpUrls,
    });

    if (typeof skillManager.loadExternalMcpToolsAsync === 'function') {
        if (combinedServers.length > 0) {
            await skillManager.loadExternalMcpToolsAsync({ servers: combinedServers, quiet });
        }
    }

    return buildAgentBundle({
        modelName,
        baseSystemPrompt,
        skillManager,
        snapshot,
        maxTurns,
        compaction,
        maxProtectedRecentMessages,
        toolOutputLimits,
        identity,
        riskProfile,
    });
}

module.exports = { createAgent, createAgentAsync, getBuiltInTools, DEFAULT_SYSTEM_PROMPT };
