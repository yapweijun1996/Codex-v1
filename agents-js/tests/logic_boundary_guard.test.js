const { guardToolOutput } = require('../utils/agent-tool-output-guard');

describe('Tool output guard - boundary cases', () => {
    it('never throws on BigInt / NaN / Infinity and stays JSON-serializable', () => {
        const input = {
            big: 1n,
            nan: Number.NaN,
            inf: Number.POSITIVE_INFINITY,
            ninf: Number.NEGATIVE_INFINITY,
        };

        const guarded = guardToolOutput({
            toolName: 'demo',
            value: input,
            limits: { maxObjectKeys: 50, maxDepth: 5, maxStringChars: 2000 },
        });

        expect(guarded).toBeTruthy();
        // Whatever representation, the guarded result must be JSON.stringify-able.
        expect(() => JSON.stringify(guarded)).not.toThrow();
        const roundTrip = JSON.parse(JSON.stringify(guarded));
        expect(roundTrip).toBeTruthy();
    });

    it('handles very deep nesting with maxDepth guard and stays JSON-serializable', () => {
        let obj = { value: 0 };
        for (let i = 0; i < 80; i += 1) obj = { next: obj };

        const guarded = guardToolOutput({
            toolName: 'demo',
            value: obj,
            limits: { maxDepth: 3, maxObjectKeys: 10, maxStringChars: 5000 },
        });

        expect(guarded).toBeTruthy();
        expect(() => JSON.stringify(guarded)).not.toThrow();
    });

    it('handles circular objects by producing a guarded placeholder', () => {
        const a = { name: 'a' };
        a.self = a;

        const guarded = guardToolOutput({ toolName: 'demo', value: a, limits: { maxDepth: 10 } });
        expect(guarded).toBeTruthy();
        expect(() => JSON.stringify(guarded)).not.toThrow();
    });

    it('truncates huge strings without attempting to measure massive JSON bytes', () => {
        const huge = 'x'.repeat(500000);
        const guarded = guardToolOutput({
            toolName: 'demo',
            value: huge,
            limits: { maxStringChars: 1000, headChars: 600, tailChars: 200 },
        });

        expect(guarded).toBeTruthy();
        expect(typeof guarded).toBe('object');
        expect(guarded._agentsjs_tool_output_guard.truncated).toBe(true);
        expect(guarded._agentsjs_tool_output_guard.kind).toBe('string');
        expect(typeof guarded.preview).toBe('string');
        expect(guarded.preview.length).toBeLessThanOrEqual(1000 + 10);
        expect(() => JSON.stringify(guarded)).not.toThrow();
    });
});
