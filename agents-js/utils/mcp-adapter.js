// MCP adapter helpers (pure JS, works in Node + Browser).
//
// Reference: codex-main/codex-rs/mcp-types/src/lib.rs
// - Tool.inputSchema
// - CallToolResult: { content: ContentBlock[], isError?: boolean, structuredContent?: any }

function toMcpInputSchema(parameters) {
    const p = parameters && typeof parameters === 'object' ? parameters : null;
    const schema = {
        type: 'object',
        properties: {},
    };

    if (!p) return schema;

    // Our existing tool shape uses `parameters` (OpenAI-like) with JSON Schema.
    if (p.type) schema.type = p.type;
    if (p.properties && typeof p.properties === 'object') schema.properties = p.properties;
    if (Array.isArray(p.required)) schema.required = p.required;
    if (p.description) schema.description = p.description;
    if (p.title) schema.title = p.title;

    return schema;
}

function _isContentBlockArray(content) {
    return Array.isArray(content) && content.every((b) => b && typeof b === 'object' && typeof b.type === 'string');
}

function toMcpCallToolResult(output, { isError } = {}) {
    // If the tool already returns MCP style, keep it (best-effort normalize).
    if (output && typeof output === 'object' && !Array.isArray(output)) {
        const hasContent = _isContentBlockArray(output.content);
        const normalized = {
            content: hasContent ? output.content : undefined,
            structuredContent: output.structuredContent,
            isError: (typeof output.isError === 'boolean') ? output.isError : undefined,
        };

        if (!normalized.content) {
            // Fallback: stringify the object into a text block.
            normalized.structuredContent = (normalized.structuredContent === undefined) ? output : normalized.structuredContent;
            normalized.content = [{ type: 'text', text: JSON.stringify(output, null, 2) }];
        }

        if (typeof isError === 'boolean') normalized.isError = isError;
        return normalized;
    }

    if (typeof output === 'string') {
        return {
            content: [{ type: 'text', text: output }],
            ...(typeof isError === 'boolean' ? { isError } : null),
        };
    }

    // numbers/booleans/null/arrays => stringify into text, preserve structuredContent.
    return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
        ...(typeof isError === 'boolean' ? { isError } : null),
    };
}

module.exports = {
    toMcpInputSchema,
    toMcpCallToolResult,
};
