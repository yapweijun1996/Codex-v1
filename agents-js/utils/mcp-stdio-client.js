// MCP stdio client (Node-only).
// JSON-RPC 2.0 messages are newline-delimited JSON objects.

function _isNodeRuntime() {
    return (typeof window === 'undefined'
        && typeof process !== 'undefined'
        && !!(process.versions && process.versions.node));
}

function _getNodeDeps() {
    if (!_isNodeRuntime()) return null;
    // eslint-disable-next-line global-require
    const { spawn } = require('child_process');
    return { spawn };
}

let _rpcId = 1;

class McpStdioClient {
    constructor({ serverName, command, args, env, cwd, defaultTimeoutMs = 60000 } = {}) {
        this.serverName = String(serverName || 'mcp_stdio');
        this.command = String(command || '');
        this.args = Array.isArray(args) ? args.map(String) : [];
        this.env = (env && typeof env === 'object' && !Array.isArray(env)) ? env : null;
        this.cwd = cwd ? String(cwd) : undefined;
        this.defaultTimeoutMs = (typeof defaultTimeoutMs === 'number' && Number.isFinite(defaultTimeoutMs) && defaultTimeoutMs > 0)
            ? defaultTimeoutMs
            : 60000;

        this._proc = null;
        this._buffer = '';
        this._pending = new Map(); // id -> { resolve, reject, timer }
        this._initPromise = null;
    }

    isRunning() {
        return !!(this._proc && !this._proc.killed);
    }

    async start() {
        if (this.isRunning()) return;

        const deps = _getNodeDeps();
        if (!deps) throw new Error('[MCP][stdio] Not supported in this runtime.');
        if (!this.command) throw new Error('[MCP][stdio] Missing command.');

        const { spawn } = deps;

        const child = spawn(this.command, this.args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...(process.env || {}),
                ...(this.env ? this.env : {}),
            },
            cwd: this.cwd,
        });

        this._proc = child;
        this._buffer = '';

        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk) => this._onStdout(chunk));

        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (chunk) => {
            // Keep stderr visible for debugging.
            const t = String(chunk || '').trim();
            if (t) console.warn(`[MCP][stdio:${this.serverName}] ${t}`);
        });

        child.on('exit', (code, signal) => {
            const msg = `[MCP][stdio:${this.serverName}] process exited (code=${code}, signal=${signal || 'none'})`;
            this._rejectAllPending(new Error(msg));
            this._proc = null;
            this._initPromise = null;
        });

        child.on('error', (err) => {
            const msg = `[MCP][stdio:${this.serverName}] process error: ${String(err && err.message ? err.message : err)}`;
            this._rejectAllPending(new Error(msg));
            this._proc = null;
            this._initPromise = null;
        });
    }

    async stop() {
        if (!this._proc) return;
        try {
            this._proc.kill();
        } catch {
            // ignore
        }
        this._rejectAllPending(new Error(`[MCP][stdio:${this.serverName}] stopped`));
        this._proc = null;
        this._initPromise = null;
    }

    _rejectAllPending(err) {
        for (const { reject, timer } of this._pending.values()) {
            if (timer) clearTimeout(timer);
            try { reject(err); } catch { /* ignore */ }
        }
        this._pending.clear();
    }

    _onStdout(chunk) {
        this._buffer += String(chunk || '');
        while (true) {
            const idx = this._buffer.indexOf('\n');
            if (idx === -1) break;
            const line = this._buffer.slice(0, idx).trim();
            this._buffer = this._buffer.slice(idx + 1);
            if (!line) continue;
            this._handleLine(line);
        }
    }

    _handleLine(line) {
        // Some servers may output non-JSON logs; ignore those lines.
        if (!line.startsWith('{')) return;
        let msg;
        try {
            msg = JSON.parse(line);
        } catch {
            return;
        }

        if (!msg || typeof msg !== 'object') return;
        const id = msg.id;
        if (id === undefined || id === null) return;

        const pending = this._pending.get(String(id));
        if (!pending) return;
        this._pending.delete(String(id));
        if (pending.timer) clearTimeout(pending.timer);

        if (msg.error) {
            const code = (msg.error && msg.error.code !== undefined) ? msg.error.code : 'unknown';
            const m = (msg.error && msg.error.message) ? msg.error.message : 'JSON-RPC error';
            pending.reject(new Error(`[MCP][stdio:${this.serverName}] JSON-RPC error ${code}: ${m}`));
            return;
        }
        pending.resolve(msg.result);
    }

    async request(method, params, { timeoutMs } = {}) {
        await this.start();
        if (!this._proc || !this._proc.stdin) throw new Error('[MCP][stdio] process not running');

        const id = String(_rpcId++);
        const payload = {
            jsonrpc: '2.0',
            id,
            method,
            ...(params !== undefined ? { params } : null),
        };

        const ms = (typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0)
            ? timeoutMs
            : this.defaultTimeoutMs;

        const p = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this._pending.delete(id);
                reject(new Error(`[MCP][stdio:${this.serverName}] Timeout after ${ms}ms (${method})`));
            }, ms);
            if (timer && typeof timer.unref === 'function') timer.unref();
            this._pending.set(id, { resolve, reject, timer });
        });

        this._proc.stdin.write(JSON.stringify(payload) + '\n');
        return await p;
    }

    async ensureInitialized() {
        if (this._initPromise) return this._initPromise;
        this._initPromise = (async () => {
            const params = {
                protocolVersion: '2025-03-26',
                clientInfo: { name: 'agents-js', version: '0.0.0' },
                capabilities: { tools: {} },
            };
            try {
                await this.request('initialize', params, { timeoutMs: this.defaultTimeoutMs });
            } catch {
                // Best-effort: some servers may not require initialize.
            }
        })();
        return this._initPromise;
    }

    async listTools(options = {}) {
        await this.ensureInitialized();
        const result = await this.request('tools/list', {}, options);
        return (result && Array.isArray(result.tools)) ? result.tools : (Array.isArray(result) ? result : []);
    }

    async callTool(name, args, options = {}) {
        await this.ensureInitialized();
        return await this.request('tools/call', {
            name: String(name || ''),
            arguments: (args === undefined) ? {} : args,
        }, options);
    }
}

module.exports = {
    McpStdioClient,
};
