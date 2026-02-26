describe('ui-turn-status', () => {
    it('maps awaiting_input approval to waiting-for-approval status', async () => {
        const { getUiStatusUpdateFromEvent } = await import('../browser/ui-turn-status.js');
        const update = getUiStatusUpdateFromEvent({
            type: 'state.changed',
            status: 'awaiting_input',
            metadata: { callId: 'approval:batch:1' },
        });
        expect(update.statusText).toBe('Awaiting approval...');
        expect(update.loadingText).toBe('Waiting for approval...');
    });

    it('maps executing to running-tools with active count', async () => {
        const { getUiStatusUpdateFromEvent } = await import('../browser/ui-turn-status.js');
        const update = getUiStatusUpdateFromEvent({
            type: 'state.changed',
            status: 'executing',
            metadata: { active: ['a', 'b'] },
        });
        expect(update.statusText).toBe('Running tools (2)...');
        expect(update.loadingText).toBe('Running tools (2)...');
    });

    it('maps thinking to thinking-step label', async () => {
        const { getUiStatusUpdateFromEvent } = await import('../browser/ui-turn-status.js');
        const update = getUiStatusUpdateFromEvent({
            type: 'state.changed',
            status: 'thinking',
            metadata: { step: 3 },
        });
        expect(update.statusText).toBe('Thinking (Step 3)...');
        expect(update.loadingText).toBe('Thinking...');
    });
});

