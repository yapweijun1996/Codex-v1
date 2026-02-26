const fs = require('fs');
const path = require('path');
const pc = require('picocolors');

function resetAgentState(agent) {
    agent.history = [];
    agent.currentPlan = null;
    agent._decisionTraces = [];
    agent._pendingInputs = [];
    agent._toolFailureStreak = new Map();
}

function safeCwd() {
    try {
        return process.cwd();
    } catch {
        return process.env.PWD || __dirname;
    }
}

function exportTraceToFile({ agent, baseCwd }) {
    if (!agent || typeof agent.exportSessionTrace !== 'function') {
        console.log(pc.yellow('[System] Trace export not available.'));
        return;
    }
    const trace = agent.exportSessionTrace();
    if (!trace) {
        console.log(pc.yellow('[System] Trace export returned empty result.'));
        return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `trace_${stamp}.json`;
    const filePath = path.join(baseCwd, filename);
    try {
        fs.writeFileSync(filePath, JSON.stringify(trace, null, 2));
        console.log(pc.cyan(`[System] Trace exported to ${filePath}`));
    } catch (error) {
        console.warn(pc.yellow(`[System] Failed to export trace: ${error && error.message ? error.message : error}`));
    }
}

function createPromptGuard() {
    let activePromptCount = 0;
    return {
        withPrompt: async (factory) => {
            activePromptCount += 1;
            try {
                return await factory();
            } finally {
                activePromptCount = Math.max(0, activePromptCount - 1);
            }
        },
        isPromptActive: () => activePromptCount > 0,
    };
}

module.exports = {
    createPromptGuard,
    exportTraceToFile,
    resetAgentState,
    safeCwd,
};
