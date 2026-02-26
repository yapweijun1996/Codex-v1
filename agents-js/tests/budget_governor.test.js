const { Agent } = require('../agents');
const { countBudgetUsage, bumpPromptTokenLedger, evaluateBudgetGovernor } = require('../utils/budget-governor');
const { RiskLevel } = require('../utils/imda-constants');

describe('BudgetGovernor soft fuse', () => {
    it('counts tool calls and failures from tool history', () => {
        const history = [
            { role: 'user', content: 'hi' },
            { role: 'system', name: 'ok_tool', content: JSON.stringify({ isError: false }) },
            { role: 'system', name: 'bad_tool', content: JSON.stringify({ isError: true }) },
        ];

        const usage = countBudgetUsage(history, 0);
        expect(usage.toolCalls).toBe(2);
        expect(usage.failures).toBe(1);
        expect(usage.failureBuckets).toEqual({ network: 0, logic: 1 });
    });

    it('categorizes maxFailures by network vs logic buckets', () => {
        const history = [
            { role: 'system', name: 'net_tool', content: JSON.stringify({ isError: true, error: 'TimeoutError' }) },
            { role: 'system', name: 'logic_tool', content: JSON.stringify({ isError: true, error: 'ValidationFailed' }) },
        ];

        const usage = countBudgetUsage(history, 0);
        expect(usage.failures).toBe(2);
        expect(usage.failureBuckets).toEqual({ network: 1, logic: 1 });
    });

    it('uses incremental prompt-token ledger to avoid cumulative over-counting', () => {
        const agent = { _turnBudgetLedger: { promptTokens: 0, lastPromptSample: null }, runPolicy: { budget: { maxPromptTokens: 95 } }, history: [] };

        bumpPromptTokenLedger(agent, 80);
        bumpPromptTokenLedger(agent, 90);

        const check = evaluateBudgetGovernor({ agent, turnStartIndex: 0 });
        expect(agent._turnBudgetLedger.promptTokens).toBe(90);
        expect(check.exceeded).toBe(false);

        bumpPromptTokenLedger(agent, 120);
        const check2 = evaluateBudgetGovernor({ agent, turnStartIndex: 0 });
        expect(agent._turnBudgetLedger.promptTokens).toBe(120);
        expect(check2.exceeded).toBe(true);
        expect(check2.reason).toBe('prompt_tokens');
    });

    it('maxPromptTokens boundary: equal limit does not trigger, limit+1 triggers', () => {
        const agent = {
            _turnBudgetLedger: { promptTokens: 0, lastPromptSample: null },
            runPolicy: { budget: { maxPromptTokens: 100 } },
            history: [],
        };

        bumpPromptTokenLedger(agent, 100);
        const equalCheck = evaluateBudgetGovernor({ agent, turnStartIndex: 0 });
        expect(equalCheck.exceeded).toBe(false);

        bumpPromptTokenLedger(agent, 101);
        const plusOneCheck = evaluateBudgetGovernor({ agent, turnStartIndex: 0 });
        expect(plusOneCheck.exceeded).toBe(true);
        expect(plusOneCheck.reason).toBe('prompt_tokens');
        expect(plusOneCheck.usage.promptTokensSource).toBe('turn_ledger');
    });

    it('triggers soft fuse when tool call budget is exceeded', async () => {
        const tools = [{
            name: 'echo_tool',
            description: 'echo',
            risk: RiskLevel.NONE,
            parameters: { type: 'object', properties: {}, required: [] },
            func: async () => ({ ok: true }),
        }];

        const llm = {
            calls: 0,
            async chat() {
                this.calls += 1;
                if (this.calls <= 3) {
                    return {
                        content: null,
                        tool_calls: [{ id: `c_${this.calls}`, name: 'echo_tool', arguments: '{}' }],
                    };
                }
                return { content: 'done', tool_calls: [] };
            },
        };

        const agent = new Agent({ llm, tools, approvalPolicy: 'never' });
        const events = [];
        agent.on('budget_fuse_triggered', (ev) => events.push(ev));

        const out = await agent.run('trigger', {
            policy: {
                budget: { maxTurns: 8, maxToolCalls: 1, maxFailures: 8 },
            },
        });

        expect(out).toContain('Soft budget fuse triggered: tool calls');
        expect(events).toHaveLength(1);
        expect(events[0].reason).toBe('tool_calls');
        expect(events[0].promptTokensSource).toBe('turn_ledger');
        expect(typeof events[0].promptTokensUsed).toBe('number');

        const trace = agent.exportSessionTrace();
        const types = trace.events.map((ev) => ev.type);
        expect(types.includes('budget.fuse.triggered')).toBe(true);
        expect(trace.metadata.agent.turnBudgetLedger).toBeTruthy();
    });
});
