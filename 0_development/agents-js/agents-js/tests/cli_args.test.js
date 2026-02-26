const { parseArgs } = require('../utils/cli-args');

describe('cli-args', () => {
    it('parses flags and prompt text', () => {
        const parsed = parseArgs(['--resume', '--debug', '--app-never', 'build', 'a', 'feature']);
        expect(parsed).toEqual({
            resume: true,
            help: false,
            debug: true,
            appNever: true,
            queryParts: ['build', 'a', 'feature'],
        });
    });

    it('supports short flags', () => {
        const parsed = parseArgs(['-r', '-d', 'hello']);
        expect(parsed.resume).toBe(true);
        expect(parsed.debug).toBe(true);
        expect(parsed.queryParts).toEqual(['hello']);
    });

    it('keeps unknown args in query parts', () => {
        const parsed = parseArgs(['--unknown', 'task']);
        expect(parsed.queryParts).toEqual(['--unknown', 'task']);
    });
});
