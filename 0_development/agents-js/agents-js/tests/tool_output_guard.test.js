const { guardToolOutput } = require('../utils/agent-tool-output-guard');

describe('Tool output guard', () => {
    it('truncates long strings with preview + metadata', () => {
        const long = 'a'.repeat(20000);
        const guarded = guardToolOutput({
            toolName: 'demo',
            value: long,
            limits: { maxStringChars: 1000, headChars: 600, tailChars: 300 },
        });

        expect(typeof guarded).toBe('object');
        expect(guarded._agentsjs_tool_output_guard.truncated).toBe(true);
        expect(guarded._agentsjs_tool_output_guard.kind).toBe('string');
        expect(guarded._agentsjs_tool_output_guard.originalChars).toBe(20000);
        expect(typeof guarded.preview).toBe('string');
        expect(guarded.preview.length).toBeLessThanOrEqual(1000 + 10);
        expect(JSON.stringify(guarded).length).toBeGreaterThan(0);
    });

    it('truncates arrays by item count', () => {
        const arr = Array.from({ length: 100 }, (_v, i) => i);
        const guarded = guardToolOutput({ toolName: 'demo', value: arr, limits: { maxArrayItems: 10 } });
        expect(guarded._agentsjs_tool_output_guard.kind).toBe('array');
        expect(guarded._agentsjs_tool_output_guard.originalItems).toBe(100);
        expect(guarded._agentsjs_tool_output_guard.keptItems).toBe(10);
        expect(Array.isArray(guarded.preview)).toBe(true);
        expect(guarded.preview.length).toBe(10);
        expect(JSON.stringify(guarded).length).toBeGreaterThan(0);
    });

    it('truncates objects by key count', () => {
        const obj = {};
        for (let i = 0; i < 100; i += 1) obj[`k${i}`] = i;
        const guarded = guardToolOutput({ toolName: 'demo', value: obj, limits: { maxObjectKeys: 10 } });
        expect(guarded._agentsjs_tool_output_guard.kind).toBe('object');
        expect(guarded._agentsjs_tool_output_guard.originalKeys).toBe(100);
        expect(guarded._agentsjs_tool_output_guard.keptKeys).toBe(10);
        expect(typeof guarded.preview).toBe('object');
        expect(Object.keys(guarded.preview).length).toBe(10);
        expect(JSON.stringify(guarded).length).toBeGreaterThan(0);
    });

    it('respects maxDepth for deeply nested values', () => {
        const nested = { a: { b: { c: { d: { e: { f: 1 } } } } } };
        const guarded = guardToolOutput({ toolName: 'demo', value: nested, limits: { maxDepth: 2 } });
        const inner = guarded.a.b;
        expect(typeof inner).toBe('object');
        expect(inner._agentsjs_tool_output_guard.kind).toBe('max_depth');
        expect(typeof inner.preview).toBe('string');
        expect(JSON.stringify(guarded).length).toBeGreaterThan(0);
    });

    it('keeps small values intact', () => {
        expect(guardToolOutput({ toolName: 'demo', value: 'ok', limits: { maxStringChars: 10 } })).toBe('ok');
        expect(guardToolOutput({ toolName: 'demo', value: 3 })).toBe(3);
        expect(guardToolOutput({ toolName: 'demo', value: null })).toBe(null);
    });
});
