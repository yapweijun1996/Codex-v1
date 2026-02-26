const { SecurityValidator } = require('./security');
const { DEFAULT_TOOL_TIMEOUT_MS } = require('./self-heal');
const { applyPatch } = require('./apply-patch');
const { exec } = require('child_process');
const { RiskLevel } = require('./imda-constants');
const { getRagBuiltInTools } = require('./rag/rag-built-in-tools');

function getBuiltInTools(skillManager, options = {}) {
    const ragService = options && options.ragService ? options.ragService : null;

    return [
        {
            name: 'run_command',
            description: 'Execute a shell command on the host system. Use this to run scripts, list files, etc.',
            risk: RiskLevel.HIGH,
            meta: { intentTemplate: 'run command "{command}"' },
            parameters: {
                type: 'object',
                properties: {
                    command: { type: 'string', description: "The command to run (e.g. 'ls', 'node script.js')" },
                    timeoutMs: { type: 'number', description: 'Optional timeout in milliseconds (default 30000).' },
                },
                required: ['command'],
            },
            func: async ({ command, timeoutMs }) => {
                const verdict = SecurityValidator.validateTool('run_command', { command });
                if (!verdict.safe) {
                    return {
                        error: 'Access Denied',
                        reason: verdict.reason || 'Restricted command',
                        platform: verdict.platform,
                    };
                }

                const ms = (typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0)
                    ? timeoutMs
                    : DEFAULT_TOOL_TIMEOUT_MS;

                return new Promise((resolve) => {
                    exec(command, { timeout: ms }, (error, stdout, stderr) => {
                        const out = {
                            stdout: String(stdout || '').trim(),
                            stderr: String(stderr || '').trim(),
                            exitCode: error ? error.code : 0,
                        };
                        if (error && String(error.code).toUpperCase() === 'ETIMEDOUT') {
                            resolve({ ...out, error: 'Timeout', timeoutMs: ms });
                            return;
                        }
                        resolve(out);
                    });
                });
            },
        },
        {
            name: 'apply_patch',
            description: 'Apply a patch to local files using the apply_patch format.',
            risk: RiskLevel.HIGH,
            meta: { intentTemplate: 'apply patch' },
            parameters: {
                type: 'object',
                properties: {
                    input: { type: 'string', description: 'The full apply_patch payload.' },
                },
                required: ['input'],
            },
            func: async ({ input }) => {
                const verdict = SecurityValidator.validateTool('apply_patch', { input });
                if (!verdict.safe) {
                    return {
                        error: 'Access Denied',
                        reason: verdict.reason || 'Restricted tool',
                        platform: verdict.platform,
                    };
                }
                try {
                    return applyPatch({ input, cwd: process.cwd() });
                } catch (error) {
                    return {
                        error: 'ApplyPatchError',
                        message: String(error && error.message ? error.message : error),
                    };
                }
            },
        },
        {
            name: 'list_available_skills',
            description: "List all specialized skills available in the system. Use this if you encounter a task you don't know how to handle.",
            risk: RiskLevel.NONE,
            meta: { intentTemplate: 'list available skills' },
            parameters: { type: 'object', properties: {} },
            func: async () => {
                if (typeof skillManager.refreshSkillsAsync === 'function') {
                    await skillManager.refreshSkillsAsync({ preferEsmTools: true, quiet: true });
                } else {
                    skillManager.refreshSkills();
                }
                return skillManager.getSkillList();
            },
        },
        {
            name: 'read_skill_documentation',
            description: 'Read the detailed documentation/instructions for a specific skill.',
            risk: RiskLevel.NONE,
            meta: { intentTemplate: 'read skill docs {skillId}' },
            parameters: {
                type: 'object',
                properties: {
                    skillId: { type: 'string', description: 'The unique ID of the skill (from list_available_skills)' },
                },
                required: ['skillId'],
            },
            func: async ({ skillId }) => skillManager.getSkillDetail(skillId) || { error: 'Skill not found' },
        },
        ...getRagBuiltInTools(ragService),
        {
            name: 'update_plan',
            description: 'Update the current execution plan with steps and statuses.',
            risk: RiskLevel.LOW,
            meta: { intentTemplate: 'update plan' },
            parameters: {
                type: 'object',
                properties: {
                    explanation: { type: 'string', description: 'Brief overview of the current plan or changes.' },
                    plan: {
                        type: 'array',
                        description: 'Ordered list of plan items.',
                        items: {
                            type: 'object',
                            properties: {
                                step: { type: 'string', description: 'Task description.' },
                                status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
                            },
                            required: ['step', 'status'],
                        },
                    },
                },
                required: ['plan'],
            },
            func: async () => 'Plan updated.',
        },
        {
            name: 'request_user_input',
            description: 'Request user input when clarification is needed.',
            risk: RiskLevel.LOW,
            meta: { intentTemplate: 'request user input: {question}' },
            parameters: {
                type: 'object',
                properties: {
                    question: { type: 'string', description: 'Single clarification question.' },
                    options: {
                        type: 'array',
                        description: 'Optional choices for the user.',
                        items: { type: 'string' },
                    },
                    questions: {
                        type: 'array',
                        description: 'Multiple questions to ask the user.',
                        items: {
                            type: 'object',
                            properties: {
                                question: { type: 'string' },
                                options: { type: 'array', items: { type: 'string' } },
                            },
                            required: ['question'],
                        },
                    },
                },
            },
            func: async () => 'User input requested.',
        },
    ];
}

module.exports = { getBuiltInTools };
