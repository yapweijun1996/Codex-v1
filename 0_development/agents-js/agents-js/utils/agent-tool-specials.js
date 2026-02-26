const { handleRunCommand } = require('./tools/special-run-command');
const { handleUpdatePlan } = require('./tools/special-update-plan');
const { handleRequestUserInput } = require('./tools/special-user-input');

async function handleSpecialTool({ agent, call, args, startTime, signal }) {
    if (call.name === 'run_command') {
        return handleRunCommand({ agent, call, args, startTime, signal });
    }

    if (call.name === 'update_plan') {
        return handleUpdatePlan({ agent, call, args, startTime, signal });
    }

    if (call.name !== 'request_user_input') {
        return { handled: false };
    }

    return handleRequestUserInput({ agent, call, args, startTime, signal });
}

module.exports = { handleSpecialTool };
