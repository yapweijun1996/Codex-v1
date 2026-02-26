describe('Replay-from-Trace PoC script', () => {
    it('analyzes standard trace shape and formats a readable report', async () => {
        const { analyzeTrace, formatReport, formatTimeline } = require('../scripts/trace_replay');

        const trace = {
            version: '1.0-opencode',
            metadata: {
                sessionId: 'session_test',
                exportedAt: '2026-02-06T00:00:00.000Z',
                platform: 'node',
                agent: {
                    model: 'test-model',
                    tier: 2,
                    identity: { org: 'acme', user: 'u1' },
                },
            },
            summary: {
                totalTurns: 1,
                totalTokens: 123,
                maxRiskLevel: null,
                toolsUsed: ['searxng_query'],
            },
            events: [
                { idx: 0, timestamp: '2026-02-06T00:00:00.100Z', type: 'turn.started', payload: { message: 'hi' } },
                {
                    idx: 1,
                    timestamp: '2026-02-06T00:00:00.150Z',
                    type: 'tool.call.requested',
                    payload: {
                        details: [
                            { name: 'searxng_query', risk: 2, arguments: { query: 'x' }, intent: 'Search web' },
                        ],
                    },
                },
                {
                    idx: 2,
                    timestamp: '2026-02-06T00:00:00.200Z',
                    type: 'approval.required',
                    payload: {
                        risk: 3,
                        tools: [
                            { name: 't2', risk: 2 },
                            { name: 't3', risk: 3 },
                        ],
                    },
                },
                {
                    idx: 3,
                    timestamp: '2026-02-06T00:00:00.300Z',
                    type: 'tool.result',
                    payload: {
                        tool: 'searxng_query',
                        result: { _agentsjs_tool_output_guard: { kind: 'string', originalBytes: 10000, keptBytes: 2000 } },
                    },
                },
            ],
        };

        const analysis = analyzeTrace(trace);
        expect(analysis.ok).toBe(true);
        expect(analysis.version).toBe('1.0-opencode');
        expect(analysis.derived.eventCount).toBe(4);
        expect(analysis.summary.maxRiskLevel).toBe('Tier3');
        expect(analysis.derived.approvals.tier2).toBe(1);
        expect(analysis.derived.approvals.tier3).toBe(1);
        expect(analysis.derived.toolResultsTruncated).toBe(1);

        const report = formatReport(analysis);
        expect(String(report)).toContain('Trace Replay PoC');
        expect(String(report)).toContain('Version:');
        expect(String(report)).toContain('Approvals: total=1');
        expect(String(report)).toContain('max=Tier3');
        expect(String(report)).toContain('Tool results truncated: 1');
        expect(String(report)).toContain('Top tools:');
        expect(String(report)).toContain('searxng_query');

        const timeline = formatTimeline(trace, { maxLines: 50 });
        expect(String(timeline)).toContain('Timeline');
        expect(String(timeline)).toContain('Approval required');
        expect(String(timeline)).toContain('Result - searxng_query');
        expect(String(timeline)).toContain('query="');
    });
});
