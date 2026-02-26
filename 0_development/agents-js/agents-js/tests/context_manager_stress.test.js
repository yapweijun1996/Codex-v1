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

function createRng(seed) {
    let state = seed >>> 0;
    return function next() {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
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

function buildRandomHistory(seed, options = {}) {
    const rng = createRng(seed);
    const turns = Math.max(1, Math.floor(rng() * 6) + 3);
    const maxTools = options.maxToolsPerTurn || 3;
    const allowCrossTurn = options.allowCrossTurnToolResults !== false;

    let callCounter = 0;
    const history = [];
    const pending = [];

    for (let t = 0; t < turns; t++) {
        history.push({ role: 'user', content: `turn-${t}` });

        const wantsTools = rng() < 0.6;
        if (!wantsTools) {
            history.push({ role: 'assistant', content: `reply-${t}` });
        } else {
            const toolCount = Math.max(1, Math.floor(rng() * maxTools) + 1);
            const toolCalls = [];
            for (let k = 0; k < toolCount; k++) {
                callCounter += 1;
                const id = `call_${seed}_${callCounter}`;
                const name = rng() < 0.5 ? 'get_weather' : 'get_time';
                toolCalls.push({ id, name, arguments: '{}' });

                const shouldDefer = allowCrossTurn && rng() < 0.4;
                if (shouldDefer) {
                    pending.push({ id, name });
                } else {
                    history.push({
                        role: 'system',
                        tool_call_id: id,
                        name,
                        content: toolResultContent({ ok: true, id }),
                    });
                }
            }

            history.push({ role: 'assistant', content: null, tool_calls: toolCalls });
        }

        if (allowCrossTurn && pending.length > 0 && rng() < 0.5) {
            const emitCount = Math.max(1, Math.floor(rng() * pending.length));
            for (let i = 0; i < emitCount; i++) {
                const entry = pending.shift();
                history.push({
                    role: 'system',
                    tool_call_id: entry.id,
                    name: entry.name,
                    content: toolResultContent({ ok: true, id: entry.id }),
                });
            }
        }
    }

    while (pending.length > 0) {
        const entry = pending.shift();
        history.push({
            role: 'system',
            tool_call_id: entry.id,
            name: entry.name,
            content: toolResultContent({ ok: true, id: entry.id }),
        });
    }

    return history;
}

describe('ContextManager stress tests (atomic pruning)', () => {
    it('keeps tool call/result pairs aligned across randomized histories', () => {
        const cm = new ContextManager({ maxMessages: 16, preserveHeadMessages: 1, maxEstimatedTokens: 120 });

        for (let i = 0; i < 50; i++) {
            const history = buildRandomHistory(12345 + i, { maxToolsPerTurn: 3, allowCrossTurnToolResults: true });
            const processed = cm.process(history).history;
            const callIds = collectToolCallIds(processed);
            const resultIds = collectToolResultIds(processed);

            expect(callIds.size).toBe(resultIds.size);
            for (const id of callIds) expect(resultIds.has(id)).toBe(true);
            for (const id of resultIds) expect(callIds.has(id)).toBe(true);
        }
    });

    it('converges under very low token budgets', () => {
        const cm = new ContextManager({ maxMessages: 16, preserveHeadMessages: 0, maxEstimatedTokens: 20 });
        const big = 'x'.repeat(600);
        const history = [
            { role: 'user', content: 'start' },
            { role: 'assistant', content: big },
            {
                role: 'assistant',
                content: null,
                tool_calls: [{ id: 'c_low', name: 'lookup', arguments: '{}' }],
            },
            {
                role: 'system',
                tool_call_id: 'c_low',
                name: 'lookup',
                content: toolResultContent({ answer: big }),
            },
            { role: 'user', content: 'tail' },
        ];

        const processed = cm.process(history);
        expect(Number.isFinite(processed.meta.estimatedTokens)).toBe(true);
        expect(processed.meta.estimatedTokens).toBeLessThanOrEqual(20);
    });

    it('binds cross-turn tool results to their originating calls', () => {
        const cm = new ContextManager({ maxMessages: 8, preserveHeadMessages: 1, maxEstimatedTokens: 80 });
        const history = [
            { role: 'user', content: 'turn-1' },
            {
                role: 'assistant',
                content: null,
                tool_calls: [{ id: 'c_cross', name: 'get_time', arguments: '{}' }],
            },
            { role: 'user', content: 'turn-2' },
            { role: 'user', content: 'turn-3' },
            {
                role: 'system',
                tool_call_id: 'c_cross',
                name: 'get_time',
                content: toolResultContent({ ok: true }),
            },
        ];

        const processed = cm.process(history).history;
        const callIds = collectToolCallIds(processed);
        const resultIds = collectToolResultIds(processed);

        expect(callIds.size).toBe(resultIds.size);
        expect(callIds.has('c_cross')).toBe(resultIds.has('c_cross'));
    });

    it('keeps Gemini function call/response counts aligned', () => {
        const cm = new ContextManager({ maxMessages: 6, preserveHeadMessages: 1, maxEstimatedTokens: 120 });
        const history = [
            { role: 'user', content: 'turn-1' },
            {
                role: 'assistant',
                content: null,
                tool_calls: [
                    { id: 'c_g1', name: 'get_weather', arguments: '{}' },
                    { id: 'c_g2', name: 'get_time', arguments: '{}' },
                ],
            },
            {
                role: 'system',
                tool_call_id: 'c_g1',
                name: 'get_weather',
                content: toolResultContent({ ok: true }),
            },
        ];

        const processed = cm.process(history).history;

        withTempApiKey(() => {
            const llm = new GeminiLLM({ modelName: 'gemini-3-flash-preview' });
            const geminiHistory = llm._convertHistory(processed);

            let calls = 0;
            let responses = 0;
            for (const msg of geminiHistory) {
                if (msg.role === 'model') {
                    for (const part of msg.parts || []) {
                        if (part.functionCall) calls += 1;
                    }
                }
                if (msg.role === 'function') {
                    for (const part of msg.parts || []) {
                        if (part.functionResponse) responses += 1;
                    }
                }
            }

            expect(calls).toBe(responses);
        });
    });

    it('marks tool output with truncation marker', () => {
        const cm = new ContextManager({
            maxMessages: 8,
            preserveHeadMessages: 0,
            maxToolOutputChars: 20,
        });

        const history = [
            { role: 'user', content: 'turn-1' },
            {
                role: 'assistant',
                content: null,
                tool_calls: [{ id: 'c_trunc', name: 'lookup', arguments: '{}' }],
            },
            {
                role: 'system',
                tool_call_id: 'c_trunc',
                name: 'lookup',
                content: toolResultContent({ text: 'x'.repeat(200) }),
            },
        ];

        const processed = cm.process(history).history;
        const toolMsg = processed.find((m) => m && m.tool_call_id === 'c_trunc');

        expect(toolMsg).toBeTruthy();
        expect(typeof toolMsg.content).toBe('string');
        expect(toolMsg.content).toContain('chars truncated');
    });
});
