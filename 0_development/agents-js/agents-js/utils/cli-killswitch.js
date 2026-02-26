const readline = require('readline');

function registerEscKillSwitch({ agent, ui, isPromptActive }) {
    if (!process.stdin || !process.stdin.isTTY) return;
    readline.emitKeypressEvents(process.stdin);
    if (typeof process.stdin.setRawMode === 'function') {
        process.stdin.setRawMode(true);
    }
    const handler = (_str, key) => {
        if (!key || key.name !== 'escape') return;
        if (typeof isPromptActive === 'function' && isPromptActive()) return;
        agent.stop('esc');
        if (ui && typeof ui.persist === 'function') {
            const msg = ui.pc ? ui.pc.yellow('[System] Stop requested (Esc).') : '[System] Stop requested (Esc).';
            ui.persist(msg);
        }
    };
    process.stdin.on('keypress', handler);
    process.on('exit', () => {
        process.stdin.removeListener('keypress', handler);
        if (typeof process.stdin.setRawMode === 'function') {
            process.stdin.setRawMode(false);
        }
    });
}

module.exports = {
    registerEscKillSwitch,
};
