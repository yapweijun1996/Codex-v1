const { Agent } = require('../agents');
const { GeminiLLM } = require('../gemini-adapter');
const { RiskLevel } = require('../utils/imda-constants');

describe('MCP-shaped tool output compatibility', () => {
    it('keeps MCP-shaped tool results JSON-serializable and parseable by Gemini adapter history conversion', async () => {
        const tools = [
            {
                name: 'mcp_echo',
                description: 'Return MCP-shaped result',
                risk: RiskLevel.NONE,
                parameters: {
                    type: 'object',
                    properties: { text: { type: 'string' } },
                    required: ['text'],
                },
                func: async ({ text }) => ({
                    isError: false,
                    content: [{ type: 'text', text: String(text) }],
                    structuredContent: { echoed: String(text) },
                }),
            },
        ];

        const agent = new Agent({
            llm: { chat: async () => ({ content: 'noop', tool_calls: [] }) },
            tools,
        });

        const toolResults = await agent._executeTools([
            { id: 'call_1', name: 'mcp_echo', arguments: { text: 'hello' } },
        ]);

        expect(toolResults).toHaveLength(1);
        const toolMsg = toolResults[0];
        expect(toolMsg.role).toBe('system');
        expect(toolMsg.name).toBe('mcp_echo');
        expect(typeof toolMsg.content).toBe('string');

        // Gemini adapter expects tool content to be JSON parseable.
        const parsed = JSON.parse(toolMsg.content);
        expect(parsed).toHaveProperty('content');
        expect(Array.isArray(parsed.content)).toBe(true);
        expect(parsed.content[0]).toEqual({ type: 'text', text: 'hello' });
        expect(parsed).toHaveProperty('isError', false);

        // Also ensure Gemini adapter _convertHistory() can round-trip it.
        const gemini = new GeminiLLM({ apiKey: 'test', tools: [] });
        const history = [
            { role: 'user', content: 'hi' },
            {
                role: 'assistant',
                content: null,
                tool_calls: [{ id: 'call_1', name: 'mcp_echo', arguments: { text: 'hello' } }],
            },
            toolMsg,
        ];

        const geminiHistory = gemini._convertHistory(history);
        const fnMsg = geminiHistory.find(
            (m) => m.role === 'user' && Array.isArray(m.parts) && m.parts.some((p) => p.functionResponse)
        );
        expect(fnMsg).toBeTruthy();
        expect(Array.isArray(fnMsg.parts)).toBe(true);
        const fr = fnMsg.parts[0].functionResponse;
        expect(fr.name).toBe('mcp_echo');
        expect(fr.response.output).toEqual({
            isError: false,
            text: 'hello',
            structuredContent: { echoed: 'hello' },
        });
    });
});
