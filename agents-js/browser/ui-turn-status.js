function countActiveTools(active) {
    if (!active) return 0;
    if (Array.isArray(active)) return active.length;
    if (typeof active === 'object') return Object.keys(active).length;
    return 0;
}

export function getUiStatusUpdateFromEvent(ev) {
    if (!ev || typeof ev !== 'object') return null;

    if (ev.type === 'state.changed') {
        const status = ev.status ? String(ev.status) : '';
        const meta = ev.metadata && typeof ev.metadata === 'object' ? ev.metadata : {};

        if (status === 'awaiting_input') {
            const callId = meta.callId ? String(meta.callId) : '';
            const isApproval = callId.startsWith('approval:');
            return {
                statusText: isApproval ? 'Awaiting approval...' : 'Waiting for input...',
                statusLevel: 'warning',
                loadingText: isApproval ? 'Waiting for approval...' : 'Waiting for input...',
            };
        }

        if (status === 'executing') {
            const activeCount = countActiveTools(meta.active);
            const suffix = activeCount > 0 ? ` (${activeCount})` : '';
            return {
                statusText: `Running tools${suffix}...`,
                statusLevel: 'warning',
                loadingText: `Running tools${suffix}...`,
            };
        }

        if (status === 'thinking') {
            const step = Number(meta.step);
            const stepSuffix = Number.isFinite(step) && step > 0 ? ` (Step ${step})` : '';
            return {
                statusText: `Thinking${stepSuffix}...`,
                statusLevel: 'warning',
                loadingText: 'Thinking...',
            };
        }

        return null;
    }

    return null;
}

