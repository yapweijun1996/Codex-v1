function createAsyncEventQueue() {
    const queue = [];
    const waiters = [];
    let closed = false;

    const notify = () => {
        while (waiters.length > 0) {
            const w = waiters.shift();
            if (typeof w === 'function') w();
        }
    };

    return {
        push: (value) => {
            if (closed) return;
            queue.push(value);
            notify();
        },
        close: () => {
            if (closed) return;
            closed = true;
            notify();
        },
        async *iterate() {
            while (true) {
                if (queue.length > 0) {
                    yield queue.shift();
                    continue;
                }
                if (closed) return;
                await new Promise((resolve) => waiters.push(resolve));
            }
        },
    };
}

module.exports = { createAsyncEventQueue };
