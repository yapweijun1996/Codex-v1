function isRealtimeQuery(text) {
    if (typeof text !== 'string') return false;
    const value = text.toLowerCase();
    const realtimeTopics = [
        'weather',
        'forecast',
        'stock',
        'price',
        'prices',
        'exchange rate',
        'fx',
        'news',
    ];
    const hasTopic = realtimeTopics.some((topic) => value.includes(topic));
    const hasTimeQuery = /\b(current time|time now)\b/i.test(value);
    const hasRate = /\brate\b/i.test(value);
    const hasCurrencyCode = /\b[a-z]{3}\b/i.test(value);

    return hasTimeQuery || hasTopic || (hasRate && hasCurrencyCode);
}

const MEMORY_TOOL_NAMES = new Set([
    'memory_search',
    'kb_search',
    'memory__search_nodes',
    'memory_read_graph',
    'memory__read_graph',
]);

const WEB_SEARCH_TOOL_NAMES = new Set([
    'searxng_query',
    'read_url',
]);

function normalizeToolName(name) {
    return String(name || '').trim().toLowerCase();
}

function isMemoryToolName(name) {
    return MEMORY_TOOL_NAMES.has(normalizeToolName(name));
}

function isWebSearchToolName(name) {
    return WEB_SEARCH_TOOL_NAMES.has(normalizeToolName(name));
}

function hasToolActivitySince(history, startIndex) {
    if (!Array.isArray(history)) return false;
    for (let i = Math.max(0, startIndex); i < history.length; i++) {
        const msg = history[i];
        if (!msg || typeof msg !== 'object') continue;
        if ((msg.role === 'system' || msg.role === 'tool') && msg.tool_call_id) return true;
        if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) return true;
    }
    return false;
}

function hasMemoryToolActivitySince(history, startIndex) {
    if (!Array.isArray(history)) return false;
    for (let i = Math.max(0, startIndex); i < history.length; i++) {
        const msg = history[i];
        if (!msg || typeof msg !== 'object') continue;
        if ((msg.role !== 'system' && msg.role !== 'tool') || !msg.tool_call_id) continue;
        if (isMemoryToolName(msg.name)) return true;
    }
    return false;
}

function hasWebSearchToolRequested(toolCalls) {
    if (!Array.isArray(toolCalls)) return false;
    for (const tc of toolCalls) {
        if (!tc || typeof tc !== 'object') continue;
        if (isWebSearchToolName(tc.name)) return true;
    }
    return false;
}

function hasEvidenceToolActivitySince(history, startIndex) {
    if (!Array.isArray(history)) return false;
    const ignored = new Set([
        'update_plan',
        'list_available_skills',
        'read_skill_documentation',
        'request_user_input',
    ]);
    for (let i = Math.max(0, startIndex); i < history.length; i++) {
        const msg = history[i];
        if (!msg || typeof msg !== 'object') continue;
        if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
            for (const tc of msg.tool_calls) {
                const name = tc && tc.name ? String(tc.name) : '';
                if (name && !ignored.has(name)) return true;
            }
        }
    }
    return false;
}

function getPendingPlanSteps(plan) {
    if (!Array.isArray(plan)) return [];
    return plan
        .filter((item) => item && typeof item === 'object')
        .filter((item) => item.status === 'pending' || item.status === 'in_progress')
        .map((item) => (typeof item.step === 'string' ? item.step : ''))
        .filter(Boolean);
}

function isPersonalMemoryQuery(text) {
    if (typeof text !== 'string') return false;
    const value = text.toLowerCase();
    return /(?:\bmy\b|\bmine\b|\bme\b|\bi\s+am\b|\bi'm\b|\bremember\b|\bdo you remember\b|\bwhat(?:'s| is)\s+my\b|\bwho am i\b|\bmy\s+favorite\b|\bmy\s+car\b|\bmy\s+name\b)/i.test(value);
}

function buildMemoryQueries(text) {
    if (typeof text !== 'string') return [];
    const value = text.toLowerCase();
    const tokens = value
        .replace(/[^a-z0-9\s_-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    const stopwords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'for', 'with', 'in', 'on', 'at', 'by', 'about',
        'what', 'whats', "what's", 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'my', 'mine', 'me', 'i',
        'am', "i'm", 'remember', 'please', 'tell', 'color',
    ]);

    const keywords = tokens.filter((token) => token.length > 1 && !stopwords.has(token));
    const hasCar = keywords.includes('car') || value.includes('car');
    const hasColor = value.includes('color') || value.includes('colour');

    const queries = [];
    if (hasCar && hasColor) queries.push('car color');
    if (hasCar) queries.push('car');
    if (hasColor) queries.push('color');

    for (const word of keywords) {
        if (!queries.includes(word)) queries.push(word);
    }

    return queries.slice(0, 3);
}

function parseToolResultContent(resultMessage) {
    if (!resultMessage || typeof resultMessage.content !== 'string') return null;
    try {
        return JSON.parse(resultMessage.content);
    } catch {
        return null;
    }
}

function detectApprovalBlock(toolResults) {
    if (!Array.isArray(toolResults) || toolResults.length === 0) return null;
    const blocked = [];
    for (const msg of toolResults) {
        const parsed = parseToolResultContent(msg);
        if (!parsed || typeof parsed !== 'object') continue;
        const structured = parsed.structuredContent && typeof parsed.structuredContent === 'object'
            ? parsed.structuredContent
            : null;
        const err = structured && typeof structured.error === 'string' ? structured.error : null;
        if (err === 'ApprovalDenied' || err === 'ApprovalTimeout') {
            blocked.push({
                tool: msg && msg.name ? String(msg.name) : null,
                callId: msg && msg.tool_call_id ? String(msg.tool_call_id) : null,
                error: err,
            });
        }
    }
    return blocked.length > 0 ? blocked : null;
}

function formatApprovalBlockedHint(blocked) {
    const tools = blocked.map((b) => b && b.tool ? b.tool : '').filter(Boolean);
    const unique = Array.from(new Set(tools));
    const list = unique.length ? unique.join(', ') : 'the requested tool(s)';
    return (
        `User denied approval for: ${list}.\n` +
        `Update your plan: mark the related step(s) as blocked/cannot-complete, then continue with a partial answer using the approved tool results.\n` +
        `Do not keep re-requesting the same tool unless the user explicitly asks to try again or changes their decision.`
    );
}

function countSuccessfulEvidenceTools({ toolResults }) {
    if (!Array.isArray(toolResults) || toolResults.length === 0) return 0;
    const ignored = new Set([
        'update_plan',
        'list_available_skills',
        'read_skill_documentation',
        'request_user_input',
    ]);
    let count = 0;
    for (const msg of toolResults) {
        const name = msg && msg.name ? String(msg.name) : '';
        if (name && ignored.has(name)) continue;
        const parsed = parseToolResultContent(msg);
        if (!parsed || typeof parsed !== 'object') continue;
        if (parsed.isError === false) {
            count += 1;
            continue;
        }
        const structured = parsed.structuredContent && typeof parsed.structuredContent === 'object'
            ? parsed.structuredContent
            : null;
        const hasErr = structured && typeof structured.error === 'string' && structured.error.length > 0;
        if (!hasErr && parsed.isError !== true) {
            count += 1;
        }
    }
    return count;
}

function hasAnyTurnEvidence({ history, startIndex }) {
    if (!Array.isArray(history)) return false;
    const from = (typeof startIndex === 'number' && Number.isFinite(startIndex)) ? Math.max(0, startIndex) : 0;
    const ignored = new Set([
        'update_plan',
        'list_available_skills',
        'read_skill_documentation',
        'request_user_input',
    ]);

    for (let i = from; i < history.length; i += 1) {
        const msg = history[i];
        if (!msg || typeof msg !== 'object') continue;
        const name = msg && msg.name ? String(msg.name) : '';
        if (name && ignored.has(name)) continue;
        if (!((msg.role === 'system' || msg.role === 'tool') && msg.tool_call_id && name)) continue;

        const parsed = parseToolResultContent(msg);
        if (!parsed || typeof parsed !== 'object') continue;
        if (parsed.isError === false) return true;

        const structured = parsed.structuredContent && typeof parsed.structuredContent === 'object'
            ? parsed.structuredContent
            : null;
        const hasErr = structured && typeof structured.error === 'string' && structured.error.length > 0;
        if (!hasErr && parsed.isError !== true) return true;
    }
    return false;
}

function formatMemoryResult(mcpResult) {
    if (!mcpResult || typeof mcpResult !== 'object') return '';
    if (Array.isArray(mcpResult.content)) {
        const text = mcpResult.content
            .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
            .map((b) => b.text)
            .join('\n');
        if (text.trim()) return text.trim();
    }
    if (mcpResult.structuredContent !== undefined) {
        try {
            return JSON.stringify(mcpResult.structuredContent, null, 2);
        } catch {
            return String(mcpResult.structuredContent);
        }
    }
    return '';
}

function isEmptyMemorySearchResult(mcpResult) {
    if (!mcpResult || typeof mcpResult !== 'object') return true;
    if (Array.isArray(mcpResult.structuredContent)) return mcpResult.structuredContent.length === 0;
    if (mcpResult.structuredContent && typeof mcpResult.structuredContent === 'object') {
        const hits = mcpResult.structuredContent.hits;
        if (Array.isArray(hits)) return hits.length === 0;
        const nodes = mcpResult.structuredContent.nodes;
        if (Array.isArray(nodes)) return nodes.length === 0;
    }
    if (Array.isArray(mcpResult.content)) {
        const text = mcpResult.content.map((c) => c && c.text ? String(c.text) : '').join(' ');
        if (!text.trim()) return true;
        if (/\bno\s+results\b|\bnone\b|\bempty\b|\[\s*\]/i.test(text)) return true;
    }
    return false;
}

module.exports = {
    buildMemoryQueries,
    countSuccessfulEvidenceTools,
    detectApprovalBlock,
    formatApprovalBlockedHint,
    formatMemoryResult,
    getPendingPlanSteps,
    hasAnyTurnEvidence,
    hasMemoryToolActivitySince,
    hasEvidenceToolActivitySince,
    hasToolActivitySince,
    hasWebSearchToolRequested,
    isEmptyMemorySearchResult,
    isMemoryToolName,
    isPersonalMemoryQuery,
    isRealtimeQuery,
    isWebSearchToolName,
    parseToolResultContent,
};
