const { GeminiLLM } = require('../gemini-adapter');

describe('Gemini schema sanitizer', () => {
    it('strips unsupported keys like $schema and additionalProperties', () => {
        const tools = [
            {
                name: 't',
                description: 't',
                parameters: {
                    $schema: 'https://json-schema.org/draft/2020-12/schema',
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        x: {
                            type: 'object',
                            additionalProperties: true,
                            properties: {
                                y: { type: 'string', $schema: 'nope' },
                            },
                        },
                    },
                    required: ['x'],
                },
                func: async () => ({ ok: true }),
            },
        ];

        const formatted = GeminiLLM.prototype._formatToolsForGemini.call({}, tools);
        const decl = formatted[0].functionDeclarations[0];
        expect(decl.parameters.$schema).toBeUndefined();
        expect(decl.parameters.additionalProperties).toBeUndefined();
        expect(decl.parameters.properties.x.additionalProperties).toBeUndefined();
        expect(decl.parameters.properties.x.properties.y.$schema).toBeUndefined();
        expect(decl.parameters.type).toBe('object');
        expect(decl.parameters.required).toEqual(['x']);
    });
});
