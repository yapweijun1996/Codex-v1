// Vitest globals are enabled in vitest.config.js
const { Agent } = require('../agents');

describe('Agent.runAsyncIterator', () => {
    it('yields response chunks and a completion event', async () => {
        const llm = {
            async *chatStream() {
                yield { type: 'text', delta: 'Hello' };
            },
        };

        const agent = new Agent({ llm, tools: [], systemPrompt: 'test' });
        const events = [];
        for await (const ev of agent.runAsyncIterator('hi')) {
            events.push(ev);
        }

        expect(events.length).toBeGreaterThan(0);
        expect(events[0].type).toBe('turn.started');
        expect(events.some((e) => e.type === 'response.chunk' && e.delta === 'Hello')).toBe(true);

        const last = events[events.length - 1];
        expect(last.type).toBe('turn.completed');
        expect(last.finalResponse).toContain('Hello');
    });

    it('yields a terminal error if run() throws before done', async () => {
        const llm = {
            async *chatStream() {
                throw new Error('boom');
            },
        };

        const agent = new Agent({ llm, tools: [], systemPrompt: 'test' });
        const events = [];
        for await (const ev of agent.runAsyncIterator('hi')) {
            events.push(ev);
        }

        expect(events.some((e) => e.type === 'error' && String(e.message).includes('boom'))).toBe(true);
    });
});
