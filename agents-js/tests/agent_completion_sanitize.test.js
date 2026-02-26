const { sanitizeFinalResponse } = require('../utils/agent-completion');

describe('sanitizeFinalResponse', () => {
    it('extracts <final_answer> content when present', () => {
        const input = 'Thought: x\n<final_answer>hello\nworld</final_answer>\n';
        expect(sanitizeFinalResponse(input)).toBe('hello\nworld');
    });

    it('strips Thought/Plan/Action prefix when no <final_answer> tags exist', () => {
        const input = [
            'Thought: foo',
            'Plan: do it',
            '1. step',
            'Action: now',
            'Current Time: 123',
            'Done.',
        ].join('\n');
        expect(sanitizeFinalResponse(input)).toBe('Current Time: 123\nDone.');
    });
});
