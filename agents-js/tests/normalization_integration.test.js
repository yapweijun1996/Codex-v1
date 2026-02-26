const { ContextManager } = require('../utils/context-manager');
const { GeminiLLM } = require('../gemini-adapter');
const { toMcpCallToolResult } = require('../utils/mcp-adapter');

function withTempApiKey(fn) {
    const prev = process.env.GOOGLE_API_KEY;
    process.env.GOOGLE_API_KEY = 'test-key';
    try {
        return fn();
    } finally {
        if (prev === undefined) {
            delete process.env.GOOGLE_API_KEY;
        } else {
            process.env.GOOGLE_API_KEY = prev;
        }
    }
}

function toolResultContent(payload, options) {
    return JSON.stringify(toMcpCallToolResult(payload, options));
}

function collectToolCallIds(history) {
    const ids = new Set();
    for (const msg of history) {
        if (!msg || msg.role !== 'assistant' || !Array.isArray(msg.tool_calls)) continue;
        for (const tc of msg.tool_calls) {
            if (tc && typeof tc.id === 'string') ids.add(tc.id);
        }
    }
    return ids;
}

function collectToolResultIds(history) {
    const ids = new Set();
    for (const msg of history) {
        if (!msg || (msg.role !== 'system' && msg.role !== 'tool')) continue;
        if (typeof msg.tool_call_id === 'string') ids.add(msg.tool_call_id);
    }
    return ids;
}

function findToolResultById(history, id) {
    for (const msg of history) {
        if (!msg || (msg.role !== 'system' && msg.role !== 'tool')) continue;
        if (msg.tool_call_id === id) return msg;
    }
    return null;
}

describe('Normalization Deep Integration (L.1)', () => {
    it('removes orphan outputs and pads missing tool outputs', () => {
        const cm = new ContextManager({ maxMessages: 20, preserveHeadMessages: 1 });

        const history = [
            { role: 'user', content: 'Start' },
            {
                role: 'assistant',
                content: null,
                tool_calls: [{ id: 'c1', name: 'lookup', arguments: '{}' }],
            },
            {
                role: 'system',
                tool_call_id: 'orphan',
                name: 'unused',
                content: toolResultContent({ ok: false }),
            },
        ];

        const processed = cm.process(history).history;
        const callIds = collectToolCallIds(processed);
        const resultIds = collectToolResultIds(processed);

        expect(callIds.has('c1')).toBe(true);
        expect(resultIds.has('c1')).toBe(true);
        expect(resultIds.has('orphan')).toBe(false);

        const padded = findToolResultById(processed, 'c1');
        expect(padded).toBeTruthy();
        const payload = JSON.parse(padded.content);
        expect(payload.content?.[0]?.text).toContain('aborted');
        expect(payload.isError).toBe(true);
    });

    it('pads missing tool outputs and keeps Gemini pairs aligned under pruning', () => {
        const cm = new ContextManager({ maxMessages: 5, preserveHeadMessages: 1 });

        const history = [
            { role: 'user', content: 'Turn 1' },
            {
                role: 'assistant',
                content: null,
                tool_calls: [{ id: 'c1', name: 'get_weather', arguments: '{"city":"SG"}' }],
            },
            {
                role: 'system',
                tool_call_id: 'c1',
                name: 'get_weather',
                content: toolResultContent({ ok: true }),
            },
            { role: 'user', content: 'Turn 2' },
            {
                role: 'assistant',
                content: null,
                tool_calls: [
                    { id: 'c2', name: 'get_weather', arguments: '{"city":"NY"}' },
                    { id: 'c3', name: 'get_time', arguments: '{}' },
                ],
            },
        ];

        const processed = cm.process(history).history;
        const assistantIdx = processed.findIndex(
            (m) => m && m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length === 2
        );

        expect(assistantIdx).toBeGreaterThanOrEqual(0);
        expect(processed[assistantIdx + 1]?.tool_call_id).toBe('c2');
        expect(processed[assistantIdx + 2]?.tool_call_id).toBe('c3');
        expect(processed[assistantIdx + 1]?.name).toBe('get_weather');
        expect(processed[assistantIdx + 2]?.name).toBe('get_time');

        withTempApiKey(() => {
            const llm = new GeminiLLM({ modelName: 'gemini-3-flash-preview' });
            const geminiHistory = llm._convertHistory(processed);

            const modelTurns = geminiHistory.filter((m) => m.role === 'model');
            const functionTurns = geminiHistory.filter(
                (m) => m.role === 'user' && Array.isArray(m.parts) && m.parts.some((p) => p.functionResponse)
            );
            const lastModelTurn = modelTurns[modelTurns.length - 1];
            const lastFunctionTurn = functionTurns[functionTurns.length - 1];

            expect(lastModelTurn.parts).toHaveLength(2);
            expect(lastFunctionTurn.parts).toHaveLength(2);

            const timeResponse = lastFunctionTurn.parts.find(
                (p) => p.functionResponse && p.functionResponse.name === 'get_time'
            );
            expect(timeResponse).toBeTruthy();
            expect(timeResponse.functionResponse.response.output.text).toContain('aborted');
            expect(timeResponse.functionResponse.response.output.isError).toBe(true);
        });
    });

    it('keeps call/result pairs intact under token-driven trimming', () => {
        const cm = new ContextManager({ maxMessages: 10, preserveHeadMessages: 1, maxEstimatedTokens: 80 });
        const big = 'x'.repeat(400);

        const history = [
            { role: 'user', content: 'Start' },
            { role: 'assistant', content: big },
            {
                role: 'assistant',
                content: null,
                tool_calls: [{ id: 'c10', name: 'lookup', arguments: '{"q":"a"}' }],
            },
            {
                role: 'system',
                tool_call_id: 'c10',
                name: 'lookup',
                content: toolResultContent({ answer: 'ok' }),
            },
            { role: 'assistant', content: big },
            { role: 'user', content: 'Tail' },
        ];

        const processed = cm.process(history).history;
        const callIds = collectToolCallIds(processed);
        const resultIds = collectToolResultIds(processed);

        for (const id of callIds) {
            expect(resultIds.has(id)).toBe(true);
        }
        for (const id of resultIds) {
            expect(callIds.has(id)).toBe(true);
        }

        withTempApiKey(() => {
            const llm = new GeminiLLM({ modelName: 'gemini-3-flash-preview' });
            expect(() => llm._convertHistory(processed)).not.toThrow();
        });
    });
});
