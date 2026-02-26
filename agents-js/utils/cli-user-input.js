function normalizeSelectChoices(options) {
    return options.map((opt) => {
        if (opt && typeof opt === 'object' && 'title' in opt && 'value' in opt) {
            return { title: String(opt.title), value: opt.value };
        }
        return { title: String(opt), value: opt };
    });
}

function normalizeMultiSelectChoices(options) {
    return options.map((opt) => {
        if (opt && typeof opt === 'object' && 'title' in opt && 'value' in opt) {
            return {
                title: String(opt.title),
                value: opt.value,
                selected: Boolean(opt.selected),
            };
        }
        return { title: String(opt), value: opt, selected: true };
    });
}

function registerUserInputHandler({ agent, withPrompt, promptText, promptSelect, promptMultiSelect }) {
    let inputQueue = Promise.resolve();
    agent.on('user_input_requested', (payload) => {
        inputQueue = inputQueue.then(async () => {
            const questions = Array.isArray(payload && payload.questions) ? payload.questions : [];
            const list = questions.length > 0 ? questions : [{ question: 'Please provide input.' }];
            const answers = [];

            for (const q of list) {
                const text = (q && q.question) ? String(q.question) : 'Please provide input.';
                const options = (q && Array.isArray(q.options)) ? q.options : [];
                const inputType = q && q.inputType ? String(q.inputType) : '';
                if (options.length > 0 && inputType === 'multi_select') {
                    const choices = normalizeMultiSelectChoices(options);
                    const selection = await withPrompt(() => promptMultiSelect(text, choices));
                    if (selection.cancelled) {
                        answers.push('Deny');
                        continue;
                    }
                    answers.push({ approvedCallIds: selection.value || [] });
                    continue;
                }
                if (options.length > 0) {
                    const choices = normalizeSelectChoices(options);
                    choices.push({ title: 'Type your own answer', value: '__custom__' });
                    const selection = await withPrompt(() => promptSelect(text, choices));
                    if (selection.cancelled) {
                        answers.push('');
                        continue;
                    }
                    if (selection.value === '__custom__') {
                        const custom = await withPrompt(() => promptText(text));
                        answers.push(custom.cancelled ? '' : (custom.value || ''));
                    } else {
                        answers.push(selection.value);
                    }
                    continue;
                }
                const response = await withPrompt(() => promptText(text));
                answers.push(response.cancelled ? '' : response.value);
            }

            const response = (answers.length <= 1) ? (answers[0] || '') : { answers };
            agent.respondToUserInput(payload && payload.callId, response);
        });
    });
    return {
        waitForInputQueue: () => inputQueue,
    };
}

module.exports = {
    registerUserInputHandler,
};
