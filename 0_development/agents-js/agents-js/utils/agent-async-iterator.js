const { createAsyncEventQueue } = require('./async-event-queue');

function runAsyncIterator(agent, userInput, options = {}) {
    const { signal } = options;
    const q = createAsyncEventQueue();

    const on = (evt, fn) => agent.on(evt, fn);
    const off = (evt, fn) => {
        if (typeof agent.off === 'function') agent.off(evt, fn);
        else agent.removeListener(evt, fn);
    };

    const handlers = {
        start: (data) => q.push({ type: 'turn.started', input: data && data.message ? data.message : userInput }),
        thinking: (data) => q.push({ type: 'thinking', step: data && data.step }),
        state_changed: (data) => q.push({ type: 'state.changed', ...data }),
        context_truncated: (data) => q.push({ type: 'context.truncated', ...data }),
        assistant_message_started: (data) => q.push({ type: 'assistant_message_started', ...data }),
        agent_message_content_delta: (data) => q.push({ type: 'response.chunk', delta: data && data.delta ? data.delta : '', step: data && data.step }),
        tool_call: (data) => q.push({ type: 'tool.call', tools: data && data.tools ? data.tools : [], details: data && data.details ? data.details : [] }),
        tool_call_begin: (data) => q.push({ type: 'tool.call.begin', ...data }),
        tool_call_end: (data) => q.push({ type: 'tool.call.end', ...data }),
        tool_result: (data) => q.push({ type: 'tool.result', tool: data && data.tool, args: data && data.args, result: data && data.result }),
        knowledge_selected: (data) => q.push({ type: 'knowledge.selected', ...data }),
        tool_error: (data) => q.push({ type: 'tool.error', tool: data && data.tool, error: data && data.error }),
        plan_updated: (data) => q.push({ type: 'plan.updated', ...data }),
        approval_required: (data) => q.push({ type: 'approval.required', ...data }),
        approval_skipped: (data) => q.push({ type: 'approval.skipped', ...data }),
        user_input_requested: (data) => q.push({ type: 'user_input.requested', ...data }),
        user_input_response: (data) => q.push({ type: 'user_input.response', ...data }),
        approval_blocked: (data) => q.push({ type: 'approval.blocked', ...data }),
        decision_trace: (data) => q.push({ type: 'decision_trace', ...data }),
        token_count: (data) => q.push({ type: 'token_count', info: data && data.info ? data.info : null }),
        exec_command_begin: (data) => q.push({ type: 'exec_command.begin', ...data }),
        exec_command_output: (data) => q.push({ type: 'exec_command.output', ...data }),
        exec_command_end: (data) => q.push({ type: 'exec_command.end', ...data }),
        done: (data) => {
            q.push({
                type: 'turn.completed',
                finalResponse: data && typeof data.response === 'string' ? data.response : '',
                turnCount: data && data.turnCount,
                historyLength: data && data.historyLength,
            });
            q.close();
        },
    };

    for (const [evt, fn] of Object.entries(handlers)) on(evt, fn);

    let aborted = false;
    const abortHandler = () => {
        aborted = true;
        q.push({ type: 'error', message: 'Aborted' });
        q.close();
    };
    if (signal && typeof signal.addEventListener === 'function') {
        if (signal.aborted) abortHandler();
        else signal.addEventListener('abort', abortHandler, { once: true });
    }

    const runPromise = Promise.resolve()
        .then(() => agent.run(userInput))
        .catch((err) => {
            const msg = err && err.message ? String(err.message) : String(err);
            q.push({ type: 'error', message: msg });
            q.close();
            return null;
        });

    const iterator = (async function* iterate() {
        try {
            for await (const ev of q.iterate()) {
                yield ev;
            }
        } finally {
            for (const [evt, fn] of Object.entries(handlers)) off(evt, fn);
            if (signal && typeof signal.removeEventListener === 'function') {
                signal.removeEventListener('abort', abortHandler);
            }
            await runPromise;
            if (aborted) return;
        }
    })();

    return iterator;
}

module.exports = { runAsyncIterator };
