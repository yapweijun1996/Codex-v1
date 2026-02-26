const { DEFAULT_TOOL_TIMEOUT_MS } = require('./self-heal');

function formatTimezoneOffset(minutes) {
    if (!Number.isFinite(minutes) || minutes === 0) return 'Z';
    const sign = minutes > 0 ? '-' : '+';
    const abs = Math.abs(minutes);
    const hours = String(Math.floor(abs / 60)).padStart(2, '0');
    const mins = String(abs % 60).padStart(2, '0');
    return `${sign}${hours}:${mins}`;
}

function buildEnvironmentContext() {
    const now = new Date();
    const iso = now.toISOString();
    const offset = formatTimezoneOffset(now.getTimezoneOffset());
    let cwd = null;
    try {
        if (typeof process !== 'undefined' && process && typeof process.cwd === 'function') {
            cwd = process.cwd();
        }
    } catch {
        cwd = null;
    }

    const lines = [
        '<environment_context>',
        `  <timestamp>${iso}</timestamp>`,
        `  <timezone_offset>${offset}</timezone_offset>`,
    ];
    if (typeof cwd === 'string' && cwd.length > 0) {
        lines.push(`  <cwd>${cwd}</cwd>`);
    }
    lines.push('</environment_context>');
    return lines.join('\n');
}

function awaitUserInput(agent, callId, timeoutMs) {
    const ms = (typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0)
        ? timeoutMs
        : DEFAULT_TOOL_TIMEOUT_MS;
    return new Promise((resolve) => {
        const existing = agent._pendingUserInputs.get(callId);
        if (existing && typeof existing.reject === 'function') {
            existing.reject(new Error('Superseded by new request'));
        }

        const entry = {
            done: false,
            resolve: (value) => {
                if (entry.done) return;
                entry.done = true;
                if (entry.timer) clearTimeout(entry.timer);
                agent._pendingUserInputs.delete(callId);
                if (agent && typeof agent.emit === 'function') {
                    agent.emit('user_input_response', {
                        callId,
                        timedOut: false,
                        value,
                        timestamp: new Date().toISOString(),
                    });
                }
                resolve({ timedOut: false, value });
            },
            reject: () => {
                if (entry.done) return;
                entry.done = true;
                if (entry.timer) clearTimeout(entry.timer);
                agent._pendingUserInputs.delete(callId);
                if (agent && typeof agent.emit === 'function') {
                    agent.emit('user_input_response', {
                        callId,
                        timedOut: true,
                        value: null,
                        timestamp: new Date().toISOString(),
                    });
                }
                resolve({ timedOut: true });
            },
            timer: null,
        };

        entry.timer = setTimeout(() => {
            if (entry.done) return;
            entry.done = true;
            agent._pendingUserInputs.delete(callId);
            if (agent && typeof agent.emit === 'function') {
                agent.emit('user_input_response', {
                    callId,
                    timedOut: true,
                    value: null,
                    timestamp: new Date().toISOString(),
                });
            }
            resolve({ timedOut: true });
        }, ms);
        if (entry.timer && typeof entry.timer.unref === 'function') entry.timer.unref();

        agent._pendingUserInputs.set(callId, entry);
    });
}

function respondToUserInput(agent, callId, response) {
    let targetId = callId;
    if (!targetId) {
        if (agent._pendingUserInputs.size !== 1) return false;
        targetId = Array.from(agent._pendingUserInputs.keys())[0];
    }
    const entry = agent._pendingUserInputs.get(targetId);
    if (!entry || typeof entry.resolve !== 'function') return false;
    entry.resolve(response);
    return true;
}

function submitPendingInput(agent, text) {
    const value = (typeof text === 'string') ? text.trim() : '';
    if (!value) return false;
    if (!Array.isArray(agent._pendingInputs)) agent._pendingInputs = [];
    agent._pendingInputs.push(value);
    agent.emit('pending_input_queued', { content: value, timestamp: new Date().toISOString() });
    return true;
}

function drainPendingInputs(agent) {
    if (!Array.isArray(agent._pendingInputs) || agent._pendingInputs.length === 0) return [];
    const items = agent._pendingInputs.slice();
    agent._pendingInputs = [];
    return items;
}

module.exports = {
    awaitUserInput,
    respondToUserInput,
    submitPendingInput,
    drainPendingInputs,
    buildEnvironmentContext,
};
