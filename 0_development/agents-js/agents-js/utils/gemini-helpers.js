function sanitizeGeminiSchema(input) {
    const allowed = new Set([
        'type',
        'description',
        'enum',
        'items',
        'properties',
        'required',
        'format',
        'nullable',
        'default',
        'minimum',
        'maximum',
        'minItems',
        'maxItems',
        'minLength',
        'maxLength',
        'pattern'
    ]);

    const walk = (v) => {
        if (!v || typeof v !== 'object') return v;
        if (Array.isArray(v)) return v.map(walk);
        const out = {};
        for (const [k, val] of Object.entries(v)) {
            if (!allowed.has(k)) continue;
            if (k === 'properties' && val && typeof val === 'object' && !Array.isArray(val)) {
                const props = {};
                for (const [pk, pv] of Object.entries(val)) props[pk] = walk(pv);
                out.properties = props;
                continue;
            }
            out[k] = walk(val);
        }
        if (out.type === 'array' && out.items == null) out.items = {};
        return out;
    };

    return walk(input);
}

function formatToolsForGemini(tools) {
    if (!tools || tools.length === 0) return undefined;

    return [{
        functionDeclarations: tools.map(tool => {
            const rawParams = tool.parameters || { type: 'object', properties: {} };
            const paramSchema = sanitizeGeminiSchema(rawParams) || { type: 'object', properties: {} };
            if (!paramSchema.type) paramSchema.type = 'object';

            return {
                name: tool.name,
                description: tool.description,
                parameters: paramSchema
            };
        })
    }];
}

function normalizeToolResultForGemini(parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return parsed;

    const blocks = parsed.content;
    const isBlockArray = Array.isArray(blocks) && blocks.every((b) => b && typeof b === 'object' && typeof b.type === 'string');
    if (!isBlockArray) return parsed;

    const text = blocks
        .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text)
        .join('\n');

    const out = {};
    if (typeof parsed.isError === 'boolean') out.isError = parsed.isError;
    if (text) out.text = text;
    if (parsed.structuredContent !== undefined) out.structuredContent = parsed.structuredContent;
    return out;
}

function convertHistory(history) {
    const geminiHistory = [];
    let currentToolOutputs = [];
    // Gemini 3 streaming tool-calling requires thoughtSignature on functionCall parts.
    // Some environments (notably browser streaming) may not provide thoughtSignature reliably.
    // To avoid 400 INVALID_ARGUMENT, we degrade such tool calls into plain text summaries.
    const degradedToolCalls = new Map(); // tool_call_id -> { name, args }

    for (const msg of history) {
        if (msg.role === 'system' || msg.role === 'tool') {
            if (msg.tool_call_id && degradedToolCalls.has(msg.tool_call_id)) {
                const degraded = degradedToolCalls.get(msg.tool_call_id);
                let parsed;
                try {
                    parsed = JSON.parse(msg.content);
                } catch {
                    parsed = msg.content;
                }
                const normalized = normalizeToolResultForGemini(parsed);
                const toolText = (() => {
                    try {
                        return (normalized && typeof normalized === 'object')
                            ? JSON.stringify(normalized, null, 2)
                            : String(normalized);
                    } catch {
                        return String(normalized);
                    }
                })();
                const argsText = (() => {
                    try {
                        return JSON.stringify(degraded.args || {}, null, 2);
                    } catch {
                        return String(degraded.args || '');
                    }
                })();

                if (currentToolOutputs.length > 0) {
                    geminiHistory.push({ role: 'user', parts: currentToolOutputs });
                    currentToolOutputs = [];
                }

                geminiHistory.push({
                    role: 'user',
                    parts: [{
                        text: `Tool result (degraded): ${degraded.name}\nArgs:\n${argsText}\nResult:\n${toolText}`,
                    }],
                });
                degradedToolCalls.delete(msg.tool_call_id);
                continue;
            }

            let parsed;
            try {
                parsed = JSON.parse(msg.content);
            } catch {
                parsed = msg.content;
            }

            const normalized = normalizeToolResultForGemini(parsed);
            const responsePayload = {
                output: normalized,
            };
            const functionResponse = {
                name: msg.name,
                response: responsePayload,
            };
            if (msg.tool_call_id) functionResponse.id = msg.tool_call_id;
            currentToolOutputs.push({ functionResponse });
            continue;
        }

        if (currentToolOutputs.length > 0) {
            geminiHistory.push({ role: 'user', parts: currentToolOutputs });
            currentToolOutputs = [];
        }

        if (msg.role === 'user') {
            geminiHistory.push({ role: 'user', parts: [{ text: msg.content }] });
        } else if (msg.role === 'assistant') {
                if (msg.tool_calls && msg.tool_calls.length > 0) {
                    const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
                    const hasMissingThoughtSig = calls.some((tc) => tc && !(tc.thought_signature || tc.thoughtSignature));
                    const shouldDegrade = (typeof window !== 'undefined');
                    if (shouldDegrade && hasMissingThoughtSig) {
                        const summaries = [];
                        for (const tc of calls) {
                            if (!tc || !tc.name) continue;
                            let args;
                            try {
                            args = typeof tc.arguments === 'string' ? JSON.parse(tc.arguments) : (tc.arguments || {});
                        } catch {
                            args = tc.arguments || {};
                        }
                        if (typeof tc.id === 'string') degradedToolCalls.set(tc.id, { name: String(tc.name), args });
                        try {
                            summaries.push(`- ${String(tc.name)} ${JSON.stringify(args)}`);
                        } catch {
                            summaries.push(`- ${String(tc.name)}`);
                        }
                    }

                    const contentText = (typeof msg.content === 'string' && msg.content.trim()) ? msg.content.trim() : null;
                    const degradedText = `Tool calls:\n${summaries.join('\n')}`;
                    geminiHistory.push({
                        role: 'model',
                        parts: [{ text: contentText ? `${contentText}\n\n${degradedText}` : degradedText }],
                    });
                    continue;
                }

                const parts = [];
                const contentText = (typeof msg.content === 'string' && msg.content.trim())
                    ? msg.content
                    : null;
                if (contentText) parts.push({ text: contentText });
                for (const tc of calls) {
                    const args = typeof tc.arguments === 'string' ? JSON.parse(tc.arguments) : tc.arguments;
                    const thoughtSignature = tc.thought_signature || tc.thoughtSignature;
                    const part = { functionCall: { name: tc.name, args } };
                    if (tc.id) part.functionCall.id = tc.id;
                    if (thoughtSignature) part.thoughtSignature = thoughtSignature;
                    parts.push(part);
                }
                geminiHistory.push({ role: 'model', parts });
            } else {
                geminiHistory.push({ role: 'model', parts: [{ text: msg.content || ' ' }] });
            }
        }
    }

    if (currentToolOutputs.length > 0) {
        geminiHistory.push({ role: 'user', parts: currentToolOutputs });
    }

    return geminiHistory;
}

module.exports = {
    sanitizeGeminiSchema,
    formatToolsForGemini,
    normalizeToolResultForGemini,
    convertHistory
};
