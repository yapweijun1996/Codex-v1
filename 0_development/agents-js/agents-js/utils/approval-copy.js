const { RiskLevel } = require('./imda-constants');

function describeToolAction(toolName) {
    const name = String(toolName || '').trim();
    if (!name) return 'use a tool';

    if (name === 'run_command') return 'run a command on your computer';
    if (name === 'apply_patch') return 'modify local files in your workspace';

    if (name === 'read_file') return 'read a local file from your workspace';
    if (name === 'list_dir') return 'list files in your workspace';
    if (name === 'grep_files') return 'search text in your workspace files';
    if (name === 'view_image') return 'open a local image from your workspace';

    if (name === 'read_url') return 'fetch and read a URL';

    if (name === 'memory_search' || name === 'kb_search' || name === 'memory_read_graph') return 'read local memory/knowledge';
    if (name === 'memory_save') return 'save information into local episodic memory';
    if (name.startsWith('memory__')) return 'read saved memory';
    // External MCP tools are often namespaced as "<server>__<tool>".
    if (name.includes('__')) return 'call an external MCP tool';

    return `use "${name}"`;
}

function buildApprovalQuestion({ toolName, toolRisk, isDebug }) {
    if (isDebug) {
        return `Approve tool call: ${toolName}?`;
    }

    const action = describeToolAction(toolName);
    const highRisk = (typeof toolRisk === 'number' && toolRisk >= RiskLevel.HIGH);
    if (highRisk) {
        return `High-risk action: allow the agent to ${action}?`;
    }
    return `Allow the agent to ${action}?`;
}

module.exports = {
    describeToolAction,
    buildApprovalQuestion,
};
