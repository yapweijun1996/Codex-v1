#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const { createAgentAsync } = require('./agent-factory');
const { createUi } = require('./utils/cli-ui');
const { promptText, promptSelect, promptMultiSelect } = require('./utils/cli-prompts');
const { registerAgentEvents } = require('./utils/cli-events');
const { parseArgs, printHelp } = require('./utils/cli-args');
const { registerEscKillSwitch } = require('./utils/cli-killswitch');
const {
    createPromptGuard,
    exportTraceToFile,
    resetAgentState,
    safeCwd,
} = require('./utils/cli-helpers');
const { registerUserInputHandler } = require('./utils/cli-user-input');

function buildFallbackMcpConfig() {
    return JSON.stringify({
        mcpServers: {
            memory: {
                transport: 'stdio',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-memory'],
                defaultToolRisk: 0,
                toolRiskOverrides: {
                    search_nodes: 0,
                    read_graph: 0,
                },
                approvalMode: 'per_turn',
            },
        },
    });
}

function loadSnapshotIfNeeded({ resume, sessionPath }) {
    if (!resume || !fs.existsSync(sessionPath)) return null;
    try {
        const raw = fs.readFileSync(sessionPath, 'utf8');
        const snapshot = JSON.parse(raw);
        console.log(pc.cyan(`[System] Restored session snapshot from ${sessionPath}`));
        return snapshot;
    } catch (error) {
        console.warn(pc.yellow(`[System] Failed to load snapshot: ${error && error.message ? error.message : error}`));
        return null;
    }
}

async function main() {
    const { resume, help, debug, appNever, queryParts } = parseArgs(process.argv.slice(2));
    if (help) {
        printHelp();
        return;
    }
    if (debug && process && process.env) process.env.AGENTS_DEBUG = '1';
    if (appNever && process && process.env) process.env.AGENTS_APPROVAL_POLICY = 'never';

    const ui = createUi({ isTty: process.stdout.isTTY });
    const { stopSpinner, renderMarkdown } = ui;
    const modelName = process.env.GEMINI_MODEL;
    const baseCwd = safeCwd();
    const sessionPath = path.join(baseCwd, 'agent_session.json');
    const snapshot = loadSnapshotIfNeeded({ resume, sessionPath });
    const cwdMcpPath = path.join(baseCwd, 'mcp-config.json');
    const hasMcpFile = fs.existsSync(cwdMcpPath);
    const hasEnvMcpConfig = Boolean(process.env.MCP_CONFIG_JSON || process.env.MCP_CONFIG_PATH);
    if (!hasMcpFile && !hasEnvMcpConfig) {
        console.log(pc.cyan('[System] No MCP config found. Using default memory server.'));
    }
    if (appNever) console.log(pc.yellow('[System] Approval policy override: never (--app-never).'));

    const { agent, skillManager } = await createAgentAsync({
        ...(modelName ? { modelName } : undefined),
        ...(snapshot ? { snapshot } : undefined),
        ...(!hasMcpFile && !hasEnvMcpConfig ? { mcpConfigJson: buildFallbackMcpConfig() } : undefined),
    });

    const decisionTraceEnabled = !['0', 'false'].includes(String(process.env.AGENTS_DECISION_TRACE || '').toLowerCase());
    registerAgentEvents({ agent, debug, decisionTraceEnabled, sessionPath, ui });

    const promptGuard = createPromptGuard();
    registerEscKillSwitch({
        agent,
        ui,
        isPromptActive: promptGuard.isPromptActive,
    });
    const { waitForInputQueue } = registerUserInputHandler({
        agent,
        withPrompt: promptGuard.withPrompt,
        promptText,
        promptSelect,
        promptMultiSelect,
    });

    console.log(`\n${pc.cyan('[System] Agent Initialized Successfully')}`);
    console.log(pc.cyan(`[System] Skills discovered: ${skillManager.getSkillList().length}`));
    if (debug) console.log(pc.dim(skillManager.getSystemPromptAddition()));
    printHelp();

    async function runTurn(text) {
        try {
            stopSpinner();
            const response = await agent.run(text);
            console.log(`\n${pc.bold('--- Final Result ---')}`);
            console.log(renderMarkdown(response));
        } catch (error) {
            stopSpinner();
            console.error(pc.red('Agent failed:'), error);
        }
    }

    const initialQuery = queryParts.length > 0 ? queryParts.join(' ') : null;
    if (initialQuery) await runTurn(initialQuery);

    let shouldExit = false;
    while (!shouldExit) {
        const reply = await promptGuard.withPrompt(() => promptText('>'));
        if (reply.cancelled) {
            shouldExit = true;
            continue;
        }
        const input = String(reply.value || '').trim();
        if (!input) continue;

        if (input.startsWith('/')) {
            const cmd = input.toLowerCase();
            if (cmd === '/exit' || cmd === '/quit') {
                shouldExit = true;
                continue;
            }
            if (cmd === '/help') {
                printHelp();
                continue;
            }
            if (cmd === '/reset') {
                resetAgentState(agent);
                console.log(pc.cyan('[System] Session reset.'));
                continue;
            }
            if (cmd === '/stats') {
                const state = agent.getState();
                console.log(pc.dim(`[Stats] Status: ${state.status} | Tokens: ~${state.estimatedTokens} | History: ${state.historyLength} msgs`));
                continue;
            }
            if (cmd === '/trace') {
                exportTraceToFile({ agent, baseCwd });
                continue;
            }
            console.log(pc.yellow(`[System] Unknown command: ${input}`));
            continue;
        }

        await runTurn(input);
    }

    await waitForInputQueue();
}

main();
