// Vitest globals are enabled in vitest.config.js
const { stableStringify, makeFailureFingerprint } = require('../utils/self-heal');

describe('self-heal utils', () => {
    it('stableStringify sorts object keys deterministically', () => {
        const a = stableStringify({ b: 2, a: 1 });
        const b = stableStringify({ a: 1, b: 2 });
        expect(a).toBe(b);
        expect(a).toBe('{"a":1,"b":2}');
    });

    it('stableStringify does not throw on circular objects', () => {
        const obj = { a: 1 };
        obj.self = obj;
        const out = stableStringify(obj);
        expect(typeof out).toBe('string');
        expect(out).toMatch(/Circular/);
    });

    it('makeFailureFingerprint is stable for same args content', () => {
        const f1 = makeFailureFingerprint('tool_x', 'tool_error', { b: 2, a: 1 });
        const f2 = makeFailureFingerprint('tool_x', 'tool_error', { a: 1, b: 2 });
        expect(f1).toBe(f2);
    });
});
