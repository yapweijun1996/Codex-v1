// Minimal EventEmitter for Browser ESM.
//
// This is intentionally tiny and dependency-free so browser mode stays vanilla.

export class EventEmitter {
    constructor() {
        this._listeners = new Map();
    }

    on(event, fn) {
        if (!this._listeners.has(event)) this._listeners.set(event, []);
        this._listeners.get(event).push(fn);
        return this;
    }

    once(event, fn) {
        const wrapper = (...args) => {
            this.off(event, wrapper);
            fn(...args);
        };
        return this.on(event, wrapper);
    }

    off(event, fn) {
        const listeners = this._listeners.get(event);
        if (!listeners) return this;
        this._listeners.set(event, listeners.filter((l) => l !== fn));
        return this;
    }

    removeListener(event, fn) {
        return this.off(event, fn);
    }

    removeAllListeners(event) {
        if (event) this._listeners.delete(event);
        else this._listeners.clear();
        return this;
    }

    emit(event, ...args) {
        const listeners = this._listeners.get(event);
        if (!listeners || listeners.length === 0) return false;
        for (const fn of listeners.slice()) {
            try {
                fn(...args);
            } catch (err) {
                // Avoid breaking the emitter loop.
                console.error(`Error in listener for event "${event}":`, err);
            }
        }
        return true;
    }
}
