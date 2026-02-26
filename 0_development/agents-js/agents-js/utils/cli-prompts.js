const prompts = require('prompts');

async function promptText(message) {
    let cancelled = false;
    const response = await prompts(
        { type: 'text', name: 'value', message },
        { onCancel: () => { cancelled = true; return true; } }
    );
    return { value: response.value, cancelled };
}

async function promptSelect(message, options) {
    let cancelled = false;
    const response = await prompts(
        {
            type: 'select',
            name: 'value',
            message,
            choices: options,
        },
        { onCancel: () => { cancelled = true; return true; } }
    );
    return { value: response.value, cancelled };
}

async function promptMultiSelect(message, options) {
    let cancelled = false;
    const response = await prompts(
        {
            type: 'multiselect',
            name: 'value',
            message,
            choices: options,
            min: 0,
        },
        { onCancel: () => { cancelled = true; return true; } }
    );
    return { value: response.value, cancelled };
}

module.exports = { promptText, promptSelect, promptMultiSelect };
