// Vitest globals are enabled in vitest.config.js
const { Agent } = require('../agents');
const { GeminiLLM } = require('../gemini-adapter');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { RiskLevel } = require('../utils/imda-constants');

// Mock dependencies if needed, or stick to integration tests logic as requested.
// For robust testing, we will use real logic but careful cleanup.

const tools = [
    {
        name: "run_command",
        description: "Execute a shell command on Windows.",
        risk: RiskLevel.HIGH,
        parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] },
        func: async ({ command }) => {
            return new Promise((resolve) => {
                exec(command, (error, stdout, stderr) => {
                    resolve({
                        stdout: stdout ? stdout.trim() : "",
                        stderr: stderr ? stderr.trim() : "",
                        exitCode: error ? error.code : 0
                    });
                });
            });
        }
    },
    {
        name: "calculate",
        description: "Perform basic math calculations.",
        risk: RiskLevel.NONE,
        parameters: {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    description: "The math operation to perform",
                    enum: ["add", "subtract", "multiply", "divide"]
                },
                a: { type: "number" },
                b: { type: "number" }
            },
            required: ["operation", "a", "b"]
        },
        func: async ({ operation, a, b }) => {
            switch (operation) {
                case 'add': return { result: a + b };
                case 'subtract': return { result: a - b };
                case 'multiply': return { result: a * b };
                case 'divide': return b !== 0 ? { result: a / b } : { error: "Division by zero" };
                default: return { error: "Unknown operation" };
            }
        }
    }
];

const HAS_GOOGLE_API_KEY = Boolean(process.env.GOOGLE_API_KEY);

describe.skipIf(!HAS_GOOGLE_API_KEY)('Agent Integration Tests', () => {
    let gemini;

    beforeAll(() => {
        gemini = new GeminiLLM({
            modelName: process.env.GEMINI_MODEL || "gemini-2.5-flash",
            tools,
        });
    });

    function autoApprove(agent) {
        agent.on('user_input_requested', ({ callId }) => {
            if (String(callId || '').startsWith('approval:')) {
                agent.respondToUserInput(callId, 'Approve');
            }
        });
    }

    it('should perform simple calculations', async () => {
        const agent = new Agent({ llm: gemini, tools: tools });
        autoApprove(agent);
        const response = await agent.run("Calculate 10 multiplied by 5");
        expect(response).toContain('50');
    }, 15000); // Extended timeout for LLM

    it('should handle multi-step reasoning with tool calls', async () => {
        const agent = new Agent({ llm: gemini, tools: tools });
        autoApprove(agent);
        const response = await agent.run("Calculate 50 + 50, then divide by 2");
        expect(response).toContain('50');
    }, 60000);

    it('should execute shell commands', async () => {
        // Keep this deterministic (no external LLM dependency):
        // drive a tool call directly and verify the agent completes.
        let calls = 0;
        const llm = {
            async chat() {
                calls += 1;
                if (calls === 1) {
                    return {
                        content: null,
                        tool_calls: [
                            { id: 'call_1', name: 'run_command', arguments: JSON.stringify({ command: "echo Vitest is working" }) },
                        ],
                    };
                }
                return { content: 'Vitest is working', tool_calls: [] };
            },
        };

        const toolset = tools.map((t) => (t && t.name === 'run_command' ? { ...t, risk: RiskLevel.NONE } : t));
        const agent = new Agent({ llm, tools: toolset });
        const response = await agent.run("trigger");
        expect(response).toMatch(/Vitest is working/i);
    }, 15000);

    it('should retry on rate limits (Mocked)', async () => {
        // Mocking executeWithRetry is tricky since it's inside adapter. 
        // We can spy on the internal method via prototype or closure if accessible.
        // Or simply trust the unit test of retry.js (see below).
    });
});

const { executeWithRetry } = require('../utils/retry');

describe('Retry Helper', () => {
    it('should retry on 429 errors', async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce({ status: 429 })
            .mockRejectedValueOnce({ status: 429 })
            .mockResolvedValue('success');

        const result = await executeWithRetry(fn, { maxRetries: 3, baseDelay: 10 });

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
        const fn = vi.fn().mockRejectedValue({ status: 429 });

        await expect(executeWithRetry(fn, { maxRetries: 2, baseDelay: 10 }))
            .rejects.toEqual({ status: 429 });

        expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 Retries
    });

    it('should rethrow non-retryable errors immediately', async () => {
        const fn = vi.fn().mockRejectedValue({ status: 400 }); // Bad Request

        await expect(executeWithRetry(fn, { maxRetries: 3 }))
            .rejects.toEqual({ status: 400 });

        expect(fn).toHaveBeenCalledTimes(1);
    });
});
