const { EventEmitter } = require('events');
const readline = require('readline');
const { registerEscKillSwitch } = require('../utils/cli-killswitch');

function makeStdinMock() {
    const stdin = new EventEmitter();
    stdin.isTTY = true;
    stdin.setRawMode = vi.fn();
    return stdin;
}

describe('cli-killswitch', () => {
    let originalStdinDescriptor;

    beforeEach(() => {
        originalStdinDescriptor = Object.getOwnPropertyDescriptor(process, 'stdin');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        if (originalStdinDescriptor) {
            Object.defineProperty(process, 'stdin', originalStdinDescriptor);
        }
    });

    it('ignores Esc while prompt is active', () => {
        const stdin = makeStdinMock();
        Object.defineProperty(process, 'stdin', {
            value: stdin,
            configurable: true,
            enumerable: true,
            writable: true,
        });
        const emitSpy = vi.spyOn(readline, 'emitKeypressEvents').mockImplementation(() => {});
        const stop = vi.fn();
        const persist = vi.fn();

        const exitListenersBefore = process.listeners('exit');
        registerEscKillSwitch({
            agent: { stop },
            ui: { persist, pc: { yellow: (t) => t } },
            isPromptActive: () => true,
        });
        stdin.emit('keypress', '', { name: 'escape' });

        expect(emitSpy).toHaveBeenCalledWith(stdin);
        expect(stop).not.toHaveBeenCalled();
        expect(persist).not.toHaveBeenCalled();

        const exitListenersAfter = process.listeners('exit');
        const added = exitListenersAfter.filter((fn) => !exitListenersBefore.includes(fn));
        for (const fn of added) process.removeListener('exit', fn);
        stdin.removeAllListeners('keypress');
    });

    it('stops agent on Esc when prompt is not active', () => {
        const stdin = makeStdinMock();
        Object.defineProperty(process, 'stdin', {
            value: stdin,
            configurable: true,
            enumerable: true,
            writable: true,
        });
        vi.spyOn(readline, 'emitKeypressEvents').mockImplementation(() => {});
        const stop = vi.fn();
        const persist = vi.fn();

        const exitListenersBefore = process.listeners('exit');
        registerEscKillSwitch({
            agent: { stop },
            ui: { persist, pc: { yellow: (t) => t } },
            isPromptActive: () => false,
        });
        stdin.emit('keypress', '', { name: 'escape' });

        expect(stop).toHaveBeenCalledWith('esc');
        expect(persist).toHaveBeenCalled();

        const exitListenersAfter = process.listeners('exit');
        const added = exitListenersAfter.filter((fn) => !exitListenersBefore.includes(fn));
        for (const fn of added) process.removeListener('exit', fn);
        stdin.removeAllListeners('keypress');
    });
});
