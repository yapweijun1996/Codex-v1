const { makeApprovalDenyKey } = require('./agent-tool-approval-keys');
const { prepareBatchApprovals } = require('./agent-tool-approval-batch');
const { buildApprovalDeniedResult, requireApprovalIfNeeded } = require('./agent-tool-approval-single');

module.exports = {
    buildApprovalDeniedResult,
    requireApprovalIfNeeded,
    makeApprovalDenyKey,
    prepareBatchApprovals,
};
