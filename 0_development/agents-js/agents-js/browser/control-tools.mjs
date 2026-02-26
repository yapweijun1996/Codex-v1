export function getBrowserControlTools() {
    return [
        {
            name: 'update_plan',
            description: 'Update the current execution plan with steps and statuses.',
            // Align with core RiskLevel.LOW (1) without importing Node-only modules.
            risk: 1,
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
    ];
}

