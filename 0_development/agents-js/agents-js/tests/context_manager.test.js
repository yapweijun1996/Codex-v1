const { ContextManager } = require('../utils/context-manager');

describe('ContextManager', () => {
    it('keeps head messages and a sliding tail window', () => {
        const cm = new ContextManager({ maxMessages: 6, preserveHeadMessages: 2 });
        const history = Array.from({ length: 20 }, (_, i) => ({ role: 'user', content: `m${i}` }));

        const res = cm.process(history);
        expect(res.history).toHaveLength(6);
        expect(res.history[0].content).toBe('m0');
        expect(res.history[1].content).toBe('m1');
        expect(res.history[5].content).toBe('m19');
    });

    it('drops tool results if corresponding tool call is not kept', () => {
        const cm = new ContextManager({ maxMessages: 2, preserveHeadMessages: 1 });
        const history = [
            { role: 'user', content: 'u0' },
            {
                role: 'assistant',
                content: null,
                tool_calls: [{ id: 'call_1', name: 't', arguments: '{}' }],
            },
            { role: 'system', tool_call_id: 'call_1', name: 't', content: '{"ok":true}' },
            { role: 'assistant', content: 'done' },
        ];

        // With maxMessages=2 we keep head (u0) and last (done). The tool result must not survive.
        const res = cm.process(history);
        expect(res.history).toHaveLength(2);
        expect(res.history.some(m => m.role === 'system')).toBe(false);
        expect(res.history.some(m => m.tool_calls)).toBe(false);
    });

    it('drops tool call if not all its results are kept', () => {
        const cm = new ContextManager({ maxMessages: 3, preserveHeadMessages: 1 });
        const history = [
            { role: 'user', content: 'u0' },
            {
                role: 'assistant',
                content: null,
                tool_calls: [{ id: 'call_1', name: 't', arguments: '{}' }],
            },
            { role: 'system', tool_call_id: 'call_1', name: 't', content: '{"ok":true}' },
            { role: 'assistant', content: 'a2' },
            { role: 'assistant', content: 'a3' },
        ];

        // Selection would prefer keeping last 2 messages plus head; tool call and result are in the middle
        // and should not create an incomplete tool chain.
        const res = cm.process(history);
        expect(res.history.some(m => m.tool_calls)).toBe(false);
        expect(res.history.some(m => m.tool_call_id)).toBe(false);
    });

    it('pads missing tool outputs when a tool call is kept', () => {
        const cm = new ContextManager({ maxMessages: 3, preserveHeadMessages: 2 });
        const history = [
            { role: 'user', content: 'u0' },
            {
                role: 'assistant',
                content: null,
                tool_calls: [{ id: 'call_1', name: 't', arguments: '{}' }],
            },
            { role: 'system', tool_call_id: 'call_1', name: 't', content: '{"ok":true}' },
            { role: 'assistant', content: 'a1' },
            { role: 'user', content: 'u2' },
        ];

        const res = cm.process(history);
        const keptCall = res.history.find(m => Array.isArray(m.tool_calls));
        const paddedResult = res.history.find(m => m.tool_call_id === 'call_1');

        expect(keptCall).toBeTruthy();
        expect(paddedResult).toBeTruthy();
        expect(typeof paddedResult.content).toBe('string');
        expect(paddedResult.content).toContain('aborted');
    });

    it('respects maxEstimatedTokens by trimming non-head messages', () => {
        const cm = new ContextManager({ maxMessages: 10, preserveHeadMessages: 2, maxEstimatedTokens: 40 });
        const big = 'x'.repeat(500);
        const history = [
            { role: 'user', content: 'goal' },
            { role: 'assistant', content: 'ack' },
            { role: 'user', content: big },
            { role: 'assistant', content: big },
            { role: 'user', content: big },
            { role: 'assistant', content: 'tail' },
        ];

        const res = cm.process(history);
        // Always keep head
        expect(res.history[0].content).toBe('goal');
        expect(res.history[1].content).toBe('ack');
        // Must have trimmed something to meet the tiny token budget.
        expect(res.meta.estimatedTokens).toBeLessThanOrEqual(40);
    });

    it('filters non-tool system messages from prompt history', () => {
        const cm = new ContextManager({ maxMessages: 5, preserveHeadMessages: 0 });
        const history = [
            { role: 'system', content: 'internal system note' },
            { role: 'user', content: 'u0' },
            { role: 'assistant', content: 'a0' },
        ];

        const res = cm.process(history);
        expect(res.history.some(m => m.role === 'system')).toBe(false);
        expect(res.history).toHaveLength(2);
    });

    it('protects instruction-like user messages from trimming', () => {
        const cm = new ContextManager({ maxMessages: 2, preserveHeadMessages: 0 });
        const history = [
            { role: 'user', content: 'u0' },
            { role: 'user', content: '# AGENTS.md instructions for demo\n\n<INSTRUCTIONS>do</INSTRUCTIONS>' },
            { role: 'user', content: 'u2' },
            { role: 'assistant', content: 'a3' },
        ];

        const res = cm.process(history);
        expect(res.history.some(m => typeof m.content === 'string' && m.content.startsWith('# AGENTS.md instructions for '))).toBe(true);
    });

    it('preserves environment_context session prefix messages', () => {
        const cm = new ContextManager({ maxMessages: 2, preserveHeadMessages: 0 });
        const history = [
            { role: 'user', content: '<environment_context>\n  <timestamp>2026-01-31T23:00:00Z</timestamp>\n</environment_context>' },
            { role: 'user', content: 'u1' },
            { role: 'assistant', content: 'a2' },
            { role: 'user', content: 'u3' },
        ];

        const res = cm.process(history);
        expect(res.history.some(m => typeof m.content === 'string' && m.content.includes('<environment_context>'))).toBe(true);
    });
});
