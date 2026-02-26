function normalizeText(v) {
    const s = String(v == null ? '' : v);
    return s;
}

async function mcpEcho({ text } = {}) {
    const t = normalizeText(text);
    return {
        isError: false,
        content: [{ type: 'text', text: t }],
        structuredContent: { echoed: t },
    };
}

async function mcpFail({ message } = {}) {
    const msg = normalizeText(message || 'Simulated MCP error');
    return {
        isError: true,
        content: [{ type: 'text', text: msg }],
    };
}

export default [
    {
        name: 'mcp_echo',
        description: 'Return an MCP-shaped CallToolResult echoing the provided text.',
        parameters: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'Text to echo back in MCP content.' },
            },
            required: ['text'],
        },
        func: mcpEcho,
    },
    {
        name: 'mcp_fail',
        description: 'Return an MCP-shaped CallToolResult with isError=true.',
        parameters: {
            type: 'object',
            properties: {
                message: { type: 'string', description: 'Error message to include in MCP content.' },
            },
        },
        func: mcpFail,
    },
];
