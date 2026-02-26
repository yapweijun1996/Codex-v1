export function createUiAuditLogger({ addAuditTrace } = {}) {
    const pushAudit = (line) => {
        if (typeof addAuditTrace === 'function') addAuditTrace(line);
        const cfg = globalThis.AGENTS_CONFIG;
        const debug = Boolean(cfg && ((cfg.agent && cfg.agent.debug) || (cfg.ui && cfg.ui.auditTrace)));
        if (debug) console.log(String(line));
    };

    const ts = (ev) => (ev && ev.timestamp) ? String(ev.timestamp) : new Date().toISOString();

    const onEvent = (ev) => {
        if (!ev || !ev.type) return;

        if (ev.type === 'approval.required') {
            pushAudit(`[${ts(ev)}] approval_required | callId=${ev.callId || ''} | tool=${ev.tool || ''} | risk=${ev.risk ?? ''}`);
        }

        if (ev.type === 'user_input.requested') {
            pushAudit(`[${ts(ev)}] user_input_requested | callId=${ev.callId || ''}`);
        }

        if (ev.type === 'user_input.response') {
            const value = ev.timedOut ? 'Timeout' : (ev.value == null ? '' : String(ev.value));
            pushAudit(`[${ts(ev)}] user_input_response | callId=${ev.callId || ''} | value=${value}`);
        }

        if (ev.type === 'approval.blocked') {
            const tools = Array.isArray(ev.tools)
                ? ev.tools.map((t) => t && t.tool ? t.tool : '').filter(Boolean).join(', ')
                : '';
            pushAudit(`[${ts(ev)}] approval_blocked | reason=${ev.reason || ''} | tools=${tools}`);
        }

        if (ev.type === 'tool.call') {
            const details = Array.isArray(ev.details) ? ev.details : [];
            for (const tc of details) {
                if (!tc || !tc.name) continue;
                pushAudit(`[${new Date().toISOString()}] tool_requested | tool=${tc.name}`);
            }
        }

        if (ev.type === 'tool.call.begin') {
            pushAudit(`[${ts(ev)}] tool_begin | callId=${ev.id || ''} | tool=${ev.name || ''}`);
        }

        if (ev.type === 'tool.call.end') {
            pushAudit(`[${ts(ev)}] tool_end | callId=${ev.id || ''} | tool=${ev.name || ''} | success=${ev.success}`);
        }

        if (ev.type === 'tool.result') {
            pushAudit(`[${new Date().toISOString()}] tool_result | tool=${ev.tool || ''}`);
        }

        if (ev.type === 'knowledge.selected') {
            const ids = Array.isArray(ev.selectedIds) ? ev.selectedIds.join(',') : '';
            pushAudit(`[${ts(ev)}] knowledge_selected | tool=${ev.tool || ''} | ids=${ids}`);
        }

        if (ev.type === 'tool.error') {
            pushAudit(`[${new Date().toISOString()}] tool_error | tool=${ev.tool || ''}`);
        }
    };

    return { pushAudit, onEvent };
}
