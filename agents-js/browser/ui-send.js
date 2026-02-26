export function createSendHandler({ elements, isLoading, runAgent } = {}) {
    let inFlight = false;

    return function handleSend() {
        const input = elements && elements.messageInput ? elements.messageInput : null;
        const sendButton = elements && elements.sendButton ? elements.sendButton : null;
        const raw = input && typeof input.value === 'string' ? input.value : '';
        const message = String(raw || '').trim();

        if (!message) return;
        if (typeof isLoading === 'function' && isLoading()) return;
        if (inFlight) return;
        if (typeof runAgent !== 'function') return;

        inFlight = true;
        if (sendButton) sendButton.disabled = true;

        if (input) {
            input.value = '';
            if (input.style) input.style.height = 'auto';
            if (typeof input.focus === 'function') input.focus();
        }

        Promise.resolve()
            .then(() => runAgent(message))
            .catch((error) => console.error(error))
            .finally(() => {
                inFlight = false;
            });
    };
}

