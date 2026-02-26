const { riskLabel } = require('./imda-policy');

function formatArgsPreview(args) {
    if (args == null) return '';
    try {
        const text = JSON.stringify(args);
        if (!text) return '';
        return text.length > 160 ? `${text.slice(0, 157)}...` : text;
    } catch (error) {
        return '[unserializable args]';
    }
}

function registerAgentEvents({ agent, debug, decisionTraceEnabled, sessionPath, ui }) {
    const { pc, statusSpinner, stopSpinner, persist } = ui;

    agent.on('state_changed', ({ status, previous, metadata, timestamp }) => {
        stopSpinner();
        if (debug) {
            const timeLabel = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
            console.log(`\n${pc.dim(`[${timeLabel}]`)} ${pc.bold('Agent Status:')} ${pc.yellow(previous)} -> ${pc.green(status)}`);
            if (metadata && typeof metadata.estimatedTokens === 'number') {
                console.log(pc.dim(`[Stats] Tokens: ~${metadata.estimatedTokens} | History: ${metadata.historyLength} msgs`));
            }
            if (status === 'executing' && metadata && Array.isArray(metadata.active)) {
                for (const tool of metadata.active) {
                    if (!tool || !tool.name) continue;
                    const idLabel = tool.id ? ` (${tool.id})` : '';
                    const elapsed = typeof tool.elapsedMs === 'number' ? ` ${tool.elapsedMs}ms` : '';
                    console.log(pc.blue(`[Executing] ${tool.name}${idLabel}${elapsed}`));
                }
            }
        }

        if (status === 'awaiting_input') {
            persist(pc.cyan('[System] Agent is waiting for your response...'));
        }

        if (status === 'thinking') {
            statusSpinner.text = pc.cyan('Thinking...');
            statusSpinner.start();
        } else if (status === 'executing') {
            statusSpinner.text = pc.blue('Executing tools...');
            statusSpinner.start();
        } else {
            stopSpinner();
        }
    });

    agent.on('tool_call_begin', ({ name, id }) => {
        stopSpinner();
        if (debug) {
            const idLabel = id ? ` (${id})` : '';
            console.log(pc.blue(`  -> START ${name || 'unknown_tool'}${idLabel}`));
        }
    });

    agent.on('tool_call_end', ({ name, durationMs, success }) => {
        stopSpinner();
        const ok = success ? pc.green('OK') : pc.red('FAIL');
        const ms = (typeof durationMs === 'number') ? `${durationMs}ms` : 'n/a';
        const toolName = name || 'unknown_tool';
        persist(`  -> ${ok} ${pc.bold(toolName)} ${pc.dim(`(${ms})`)}`);
    });

    agent.on('realtime_tool_guard', ({ attempt }) => {
        stopSpinner();
        const label = attempt === 1 ? 'Reminder' : 'Final reminder';
        persist(pc.yellow(`[Guard] ${label}: realtime data requires tools.`));
    });

    agent.on('plan_completion_guard', ({ pendingCount }) => {
        stopSpinner();
        persist(pc.yellow(`[Guard] Pending plan steps: ${pendingCount}. Please complete tools first.`));
    });

    agent.on('approval_required', ({ tool, risk, args, tools, batch }) => {
        stopSpinner();
        if (!debug) return;
        const identity = (agent && typeof agent.getIdentity === 'function') ? agent.getIdentity() : null;
        const profile = (agent && typeof agent.getRiskProfile === 'function') ? agent.getRiskProfile() : null;
        const tier = profile && typeof profile.tier === 'number' ? profile.tier : null;
        const riskText = typeof risk === 'number' ? riskLabel(risk) : 'Unknown Risk';
        const tierText = typeof tier === 'number' ? riskLabel(tier) : 'Unknown Tier';
        const argText = formatArgsPreview(args);
        const toolsList = Array.isArray(tools) ? tools.map((t) => t && t.name ? t.name : '').filter(Boolean) : null;
        const lines = [
            pc.red(pc.bold('[Approval Required]')),
            `Tool: ${pc.bold(tool || (batch ? '(batch)' : 'unknown_tool'))} | Risk: ${riskText}`,
            `Agent Tier: ${tierText}`,
        ];
        if (batch && toolsList && toolsList.length) lines.push(`Calls: ${pc.dim(toolsList.join(', '))}`);
        if (identity && typeof identity === 'object') {
            lines.push(`Identity: ${identity.id || 'unknown'} | Tenant: ${identity.tenantId || 'unknown'} | Role: ${identity.role || 'unknown'}`);
        }
        if (argText) lines.push(`Args: ${pc.dim(argText)}`);
        persist(lines.join('\n'));
    });

    agent.on('approval_skipped', ({ tool, risk, args, policy, reason }) => {
        stopSpinner();
        if (!debug) return;
        const profile = (agent && typeof agent.getRiskProfile === 'function') ? agent.getRiskProfile() : null;
        const tier = profile && typeof profile.tier === 'number' ? profile.tier : null;
        const riskText = typeof risk === 'number' ? riskLabel(risk) : 'Unknown Risk';
        const tierText = typeof tier === 'number' ? riskLabel(tier) : 'Unknown Tier';
        const argText = formatArgsPreview(args);
        const why = [policy ? `policy=${policy}` : '', reason ? `reason=${reason}` : ''].filter(Boolean).join(' ');
        const lines = [
            pc.yellow(pc.bold('[Approval Skipped]')),
            `Tool: ${pc.bold(tool || 'unknown_tool')} | Risk: ${riskText}`,
            `Agent Tier: ${tierText}`,
        ];
        if (why) lines.push(`Why: ${pc.dim(why)}`);
        if (argText) lines.push(`Args: ${pc.dim(argText)}`);
        persist(lines.join('\n'));
    });

    agent.on('decision_trace', ({ step, thought, planSteps }) => {
        if (!decisionTraceEnabled || !debug) return;
        const stepLabel = typeof step === 'number' ? `Step ${step}` : 'Step';
        const thoughtLabel = thought ? `Thought: ${thought}` : 'Thought: (redacted)';
        const planLabel = (typeof planSteps === 'number') ? ` | Plan steps: ${planSteps}` : '';
        console.log(pc.magenta(`[Decision] ${stepLabel}: ${thoughtLabel}${planLabel}`));
    });

    agent.on('autosave', (data) => {
        try {
            const fs = require('fs');
            fs.writeFileSync(sessionPath, JSON.stringify(data, null, 2));
            if (debug) console.log(pc.cyan(`[System] Session snapshot saved to ${sessionPath}`));
        } catch (error) {
            console.warn(pc.yellow(`[System] Failed to save snapshot: ${error && error.message ? error.message : error}`));
        }
    });
}

module.exports = { registerAgentEvents };
