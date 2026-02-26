function callToolWithTimeout({ fn, timeoutMs, defaultTimeoutMs }) {
    const ms = (typeof timeoutMs === 'number' && timeoutMs > 0) ? timeoutMs : defaultTimeoutMs;
    let timer;

    const timeoutPromise = new Promise((resolve) => {
        timer = setTimeout(() => resolve({ timedOut: true }), ms);
        if (timer && typeof timer.unref === 'function') timer.unref();
    });

    return Promise.resolve()
        .then(() => Promise.race([
            Promise.resolve().then(fn).then((v) => ({ timedOut: false, value: v })),
            timeoutPromise,
        ]))
        .finally(() => {
            if (timer) clearTimeout(timer);
        });
}

module.exports = { callToolWithTimeout };
