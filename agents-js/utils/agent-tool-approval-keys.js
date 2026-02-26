const { stableStringify } = require('./self-heal');

function fnv1a32Hex(input) {
    const str = String(input || '');
    let hash = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
}

function makeApprovalArgsHash(args) {
    try {
        return fnv1a32Hex(stableStringify(args));
    } catch {
        return '0';
    }
}

function makeApprovalDenyKey(toolName, args) {
    return `${String(toolName || '')}:${makeApprovalArgsHash(args)}`;
}

module.exports = {
    makeApprovalArgsHash,
    makeApprovalDenyKey,
};
