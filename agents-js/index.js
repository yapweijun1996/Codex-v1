
const { createAgentAsync } = require('./agent-factory');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// --- Main Execution ---
async function main() {
    // Create Agent with all tools and skills loaded
    const modelName = process.env.GEMINI_MODEL;
    const sessionPath = path.join(process.cwd(), 'agent_session.json');
    let snapshot;

    const argv = process.argv.slice(2);
    let resumeSession = false;
    const queryParts = [];
    for (const arg of argv) {
        if (arg === '--resume' || arg === '-r') {
            resumeSession = true;
            continue;
        }
        if (arg === '--help' || arg === '-h') {
            console.log('Usage: node index.js [--resume|-r] "<your prompt>"');
            console.log('  --resume: load ./agent_session.json to continue a prior session');
            process.exit(0);
        }
        queryParts.push(arg);
    }

    if (resumeSession && fs.existsSync(sessionPath)) {
        try {
            const raw = fs.readFileSync(sessionPath, 'utf8');
            snapshot = JSON.parse(raw);
            console.log(`[System] Restored session snapshot from ${sessionPath}`);
        } catch (error) {
            console.warn(`[System] Failed to load snapshot: ${error && error.message ? error.message : error}`);
        }
    }

    const { agent, skillManager } = await createAgentAsync({
        ...(modelName ? { modelName } : undefined),
        ...(snapshot ? { snapshot } : undefined),
    });

    agent.on('state_changed', ({ status, previous, metadata, timestamp }) => {
        const timeLabel = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
        console.log(`\n[${timeLabel}] Agent Status: ${previous} -> ${status}`);

        if (metadata && typeof metadata.estimatedTokens === 'number') {
            console.log(`[Stats] Tokens: ~${metadata.estimatedTokens} | History: ${metadata.historyLength} msgs`);
        }

        if (status === 'executing' && metadata && Array.isArray(metadata.active)) {
            for (const tool of metadata.active) {
                if (!tool || !tool.name) continue;
                const idLabel = tool.id ? ` (${tool.id})` : '';
                const elapsed = typeof tool.elapsedMs === 'number' ? ` ${tool.elapsedMs}ms` : '';
                console.log(`[Executing] ${tool.name}${idLabel}${elapsed}`);
            }
        }

        if (status === 'awaiting_input') {
            console.log('[System] Agent is waiting for your response...');
        }
    });

    agent.on('tool_call_end', ({ name, durationMs, success }) => {
        const ok = success ? '✅' : '❌';
        const ms = (typeof durationMs === 'number') ? `${durationMs}ms` : 'n/a';
        const toolName = name || 'unknown_tool';
        console.log(`  └─ ${ok} ${toolName} finished in ${ms}`);
    });

    const decisionTraceEnabled = !['0', 'false'].includes(String(process.env.AGENTS_DECISION_TRACE || '').toLowerCase());
    agent.on('decision_trace', ({ step, thought, planSteps }) => {
        if (!decisionTraceEnabled) return;
        const stepLabel = typeof step === 'number' ? `Step ${step}` : 'Step';
        const thoughtLabel = thought ? `Thought: ${thought}` : 'Thought: (redacted)';
        const planLabel = (typeof planSteps === 'number') ? ` | Plan steps: ${planSteps}` : '';
        console.log(`[Decision] ${stepLabel}: ${thoughtLabel}${planLabel}`);
    });

    agent.on('autosave', (data) => {
        try {
            fs.writeFileSync(sessionPath, JSON.stringify(data, null, 2));
            console.log(`[System] Session snapshot saved to ${sessionPath}`);
        } catch (error) {
            console.warn(`[System] Failed to save snapshot: ${error && error.message ? error.message : error}`);
        }
    });

    console.log("\n[System] Agent Initialized Successfully");
    console.log(`[System] Skills discovered: ${skillManager.getSkillList().length}`);
    console.log(skillManager.getSystemPromptAddition());

    // Run a query
    const userQuery = (queryParts.length > 0)
        ? queryParts.join(' ')
        : "Write a Javascript function to calculate fibonacci. Be an expert.";

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    if (process.stdin && process.stdin.isTTY) {
        readline.emitKeypressEvents(process.stdin);
        if (typeof process.stdin.setRawMode === 'function') {
            process.stdin.setRawMode(true);
        }
        process.stdin.on('keypress', (_str, key) => {
            if (key && key.name === 'escape') {
                agent.stop('esc');
                console.log('[System] Stop requested (Esc).');
            }
        });
    }

    const ask = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));
    let inputQueue = Promise.resolve();

    agent.on('user_input_requested', (payload) => {
        inputQueue = inputQueue.then(async () => {
            const questions = Array.isArray(payload && payload.questions) ? payload.questions : [];
            const list = questions.length > 0 ? questions : [{ question: 'Please provide input.' }];
            const answers = [];

            for (const q of list) {
                const text = (q && q.question) ? String(q.question) : 'Please provide input.';
                const options = (q && Array.isArray(q.options)) ? q.options : [];
                const inputType = q && q.inputType ? String(q.inputType) : '';
                const normalized = options.map((opt) => {
                    if (opt && typeof opt === 'object' && 'title' in opt && 'value' in opt) {
                        return { title: String(opt.title), value: opt.value };
                    }
                    return { title: String(opt), value: opt };
                });

                if (options.length > 0 && inputType === 'multi_select') {
                    const lines = normalized.map((c, idx) => `${idx + 1}. ${c.title}`).join('\n');
                    const raw = await ask(`${text}\n${lines}\nPick (comma separated), or 'a' for all, or empty for none:\n> `);
                    const trimmed = String(raw || '').trim();
                    if (!trimmed) {
                        answers.push({ approvedCallIds: [] });
                        continue;
                    }
                    if (trimmed.toLowerCase() === 'a') {
                        answers.push({ approvedCallIds: normalized.map((c) => c.value) });
                        continue;
                    }
                    const picked = trimmed
                        .split(',')
                        .map((x) => parseInt(x.trim(), 10))
                        .filter((n) => Number.isFinite(n) && n >= 1 && n <= normalized.length)
                        .map((n) => normalized[n - 1].value);
                    answers.push({ approvedCallIds: picked });
                } else if (options.length > 0) {
                    const lines = normalized.map((opt, idx) => `${idx + 1}. ${opt.title}`).join('\n');
                    const raw = await ask(`${text}\n${lines}\n> `);
                    const trimmed = String(raw || '').trim();
                    const idx = parseInt(trimmed, 10);
                    const picked = (!Number.isNaN(idx) && idx >= 1 && idx <= normalized.length)
                        ? normalized[idx - 1].value
                        : trimmed;
                    answers.push(picked);
                } else {
                    const raw = await ask(`${text}\n> `);
                    answers.push(raw);
                }
            }

            const response = (answers.length <= 1) ? (answers[0] || '') : { answers };
            agent.respondToUserInput(payload && payload.callId, response);
        });
    });

    try {
        const response = await agent.run(userQuery);

        console.log("\n--- Final Result ---");
        console.log(response);
    } catch (e) {
        console.error("Agent failed:", e);
    } finally {
        await inputQueue;
        rl.close();
        if (process.stdin && process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
            process.stdin.setRawMode(false);
        }
    }
}

main();
