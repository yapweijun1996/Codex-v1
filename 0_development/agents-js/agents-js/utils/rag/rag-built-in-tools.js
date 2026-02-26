const { RiskLevel } = require('../imda-constants');

async function safeRagCall(ragService, methodName, args) {
    if (!ragService || typeof ragService[methodName] !== 'function') {
        return { error: 'rag_unavailable', message: 'RAG service is not initialized' };
    }
    try {
        return await ragService[methodName](args || {});
    } catch (error) {
        return {
            error: 'rag_error',
            message: String(error && error.message ? error.message : error),
        };
    }
}

function getRagBuiltInTools(ragService) {
    return [
        {
            name: 'memory_search',
            description: 'Search local memory (episodic/fixed) using semantic similarity.',
            risk: RiskLevel.NONE,
            meta: { intentTemplate: 'search memory: {query}' },
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string' },
                    topK: { type: 'number' },
                    tags: { type: 'array', items: { type: 'string' } },
                    minScore: { type: 'number' },
                    scope: { type: 'string', enum: ['episodic', 'fixed', 'all'] },
                },
                required: ['query'],
            },
            func: async (args) => safeRagCall(ragService, 'search', args),
        },
        {
            name: 'kb_search',
            description: 'Search fixed read-only knowledge base.',
            risk: RiskLevel.NONE,
            meta: { intentTemplate: 'search fixed knowledge: {query}' },
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string' },
                    topK: { type: 'number' },
                    tags: { type: 'array', items: { type: 'string' } },
                    minScore: { type: 'number' },
                },
                required: ['query'],
            },
            func: async (args) => safeRagCall(ragService, 'searchKnowledge', args),
        },
        {
            name: 'memory_save',
            description: 'Save a memory entry into episodic memory only.',
            risk: RiskLevel.LOW,
            meta: { intentTemplate: 'save memory: {title}' },
            parameters: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: ['note', 'preference', 'fact', 'task'] },
                    title: { type: 'string' },
                    content: { type: 'string' },
                    metadata: { type: 'object' },
                    ttlDays: { type: 'number' },
                },
                required: ['type', 'title', 'content'],
            },
            func: async (args) => safeRagCall(ragService, 'saveMemory', args),
        },
        {
            name: 'memory_read_graph',
            description: 'Read local memory graph/nodes (fixed + episodic).',
            risk: RiskLevel.NONE,
            meta: { intentTemplate: 'read memory graph' },
            parameters: { type: 'object', properties: { limit: { type: 'number' } } },
            func: async (args) => safeRagCall(ragService, 'readGraph', args),
        },
        {
            name: 'memory__search_nodes',
            description: 'Compatibility alias of memory_search for legacy memory MCP path.',
            risk: RiskLevel.NONE,
            meta: { intentTemplate: 'search memory nodes: {query}' },
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string' },
                    topK: { type: 'number' },
                    top_k: { type: 'number' },
                    minScore: { type: 'number' },
                    scope: { type: 'string', enum: ['episodic', 'fixed', 'all'] },
                    tags: { type: 'array', items: { type: 'string' } },
                },
                required: ['query'],
            },
            func: async (args = {}) => {
                const out = await safeRagCall(ragService, 'search', {
                    query: args.query,
                    topK: args.topK != null ? args.topK : args.top_k,
                    minScore: args.minScore,
                    scope: args.scope,
                    tags: args.tags,
                });
                if (out && Array.isArray(out.hits)) return { nodes: out.hits };
                return out;
            },
        },
        {
            name: 'memory__read_graph',
            description: 'Compatibility alias of memory_read_graph for legacy memory MCP path.',
            risk: RiskLevel.NONE,
            meta: { intentTemplate: 'read memory graph (compat)' },
            parameters: { type: 'object', properties: { limit: { type: 'number' } } },
            func: async (args = {}) => safeRagCall(ragService, 'readGraph', args),
        },
    ];
}

module.exports = {
    getRagBuiltInTools,
};
