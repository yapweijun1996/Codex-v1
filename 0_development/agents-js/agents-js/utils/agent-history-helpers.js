/**
 * Helpers for analyzing and classifying agent history messages.
 * Pure JS; Node + Browser compatible.
 */

const SUMMARY_PREFIX = 'Another language model started to solve this problem and produced a summary of its thinking process. You also have access to the state of the tools that were used by that language model. Use this to build on the work that has already been done and avoid duplicating work. Here is the summary produced by the other language model, use the information in this summary to assist with your own analysis:';

function isStrongInstruction(msg) {
    if (!msg || msg.role !== 'user') return false;
    if (typeof msg.content !== 'string') return false;
    const trimmed = msg.content.trimStart();
    return trimmed.startsWith('# AGENTS.md instructions for ')
        || trimmed.startsWith('<user_instructions>')
        || trimmed.startsWith('<skill');
}

function isEnvironmentContext(msg) {
    if (!msg || msg.role !== 'user' || typeof msg.content !== 'string') return false;
    return msg.content.trimStart().toLowerCase().startsWith('<environment_context>');
}

function isTurnAborted(msg) {
    if (!msg || msg.role !== 'user' || typeof msg.content !== 'string') return false;
    return msg.content.trimStart().toLowerCase().startsWith('<turn_aborted>');
}

function isSummaryMessage(msg) {
    if (!msg || msg.role !== 'user' || typeof msg.content !== 'string') return false;
    return msg.content.startsWith(SUMMARY_PREFIX);
}

function isSessionPrefixMessage(msg) {
    return isStrongInstruction(msg) || isEnvironmentContext(msg) || isSummaryMessage(msg);
}

function isInstructionLikeUserMessage(msg) {
    if (!msg || msg.role !== 'user') return false;
    if (typeof msg.content !== 'string') return false;
    const trimmed = msg.content.trimStart();
    const lowered = trimmed.toLowerCase();
    return trimmed.startsWith('# AGENTS.md instructions for ')
        || trimmed.startsWith('<user_instructions>')
        || trimmed.startsWith('<skill')
        || lowered.startsWith('<environment_context>')
        || lowered.startsWith('<turn_aborted>');
}

module.exports = {
    SUMMARY_PREFIX,
    isStrongInstruction,
    isEnvironmentContext,
    isTurnAborted,
    isSummaryMessage,
    isSessionPrefixMessage,
    isInstructionLikeUserMessage,
};
