const { toMcpCallToolResult } = require('./mcp-adapter');
const { guardToolOutput } = require('./agent-tool-output-guard');
const {
    DEFAULT_LOOP_FINGERPRINT_THRESHOLD,
    safeJsonStringify,
} = require('./self-heal');
const {
    withSelfHealHint,
} = require('./agent-self-heal');

function wrapToolOutput({ toolFailureStreak, toolName, output, isError, limits }) {
    const alreadyGuarded = output
        && typeof output === 'object'
        && output._agentsjs_tool_output_guard
        && Object.prototype.hasOwnProperty.call(output, 'preview');
    const guardedOutput = alreadyGuarded ? output : guardToolOutput({ toolName, value: output, limits });
    const wrapped = withSelfHealHint({
        toolFailureStreak,
        toolName,
        output: guardedOutput,
        defaultLoopFingerprintThreshold: DEFAULT_LOOP_FINGERPRINT_THRESHOLD,
    });
    return toMcpCallToolResult(wrapped, { isError });
}

function buildToolResultMessage({ callId, toolName, mcpResult }) {
    return {
        role: 'system',
        tool_call_id: callId,
        name: toolName,
        content: safeJsonStringify(mcpResult),
    };
}

module.exports = { wrapToolOutput, buildToolResultMessage };
