const oraImport = require('ora');
const ora = oraImport.default || oraImport;
const pc = require('picocolors');
const { marked } = require('marked');
const { markedTerminal } = require('marked-terminal');

marked.use(markedTerminal({}));

function createUi({ isTty }) {
    const statusSpinner = ora({ spinner: 'dots', isEnabled: isTty });
    const stopSpinner = () => {
        if (statusSpinner.isSpinning) statusSpinner.stop();
    };
    const persist = (text) => {
        if (statusSpinner.isSpinning) statusSpinner.stopAndPersist({ text });
        else console.log(text);
    };
    const renderMarkdown = (text) => {
        try {
            return marked.parse(String(text ?? ''));
        } catch (error) {
            return String(text ?? '');
        }
    };
    return { pc, statusSpinner, stopSpinner, persist, renderMarkdown };
}

module.exports = { createUi };
