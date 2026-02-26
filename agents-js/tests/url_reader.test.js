const http = require('http');

async function startServer(handler) {
    const server = http.createServer(handler);
    await new Promise((resolve) => server.listen(0, resolve));
    const addr = server.address();
    const port = addr && typeof addr === 'object' ? addr.port : null;
    const baseUrl = `http://127.0.0.1:${port}`;
    return { server, baseUrl };
}

describe('url_reader skill (read_url)', () => {
    it('fetches text/html and returns html_text mode output', async () => {
        const { default: tools } = await import('../skills/url_reader/tools.mjs');
        const readUrl = tools.find(t => t.name === 'read_url').func;

        const { server, baseUrl } = await startServer((req, res) => {
            if (req.url === '/page') {
                res.statusCode = 200;
                res.setHeader('content-type', 'text/html; charset=utf-8');
                res.end('<html><head><title>T</title></head><body><h1>Hello</h1><p>World</p></body></html>');
                return;
            }
            res.statusCode = 404;
            res.end('nope');
        });

        try {
            const out = await readUrl({ url: `${baseUrl}/page`, mode: 'html_text' });
            expect(out.ok).toBe(true);
            expect(out.mode).toBe('html_text');
            expect(out.text).toContain('Hello');
            expect(out.text).toContain('World');
            expect(out.contentType.toLowerCase()).toContain('text/html');
        } finally {
            server.close();
        }
    });

    it('fetches json and returns pretty json text in json mode', async () => {
        const { default: tools } = await import('../skills/url_reader/tools.mjs');
        const readUrl = tools.find(t => t.name === 'read_url').func;

        const { server, baseUrl } = await startServer((req, res) => {
            if (req.url === '/data') {
                res.statusCode = 200;
                res.setHeader('content-type', 'application/json');
                res.end(JSON.stringify({ ok: true, n: 1 }));
                return;
            }
            res.statusCode = 404;
            res.end('nope');
        });

        try {
            const out = await readUrl({ url: `${baseUrl}/data`, mode: 'json' });
            expect(out.ok).toBe(true);
            expect(out.mode).toBe('json');
            expect(out.text).toContain('"ok": true');
            expect(out.text).toContain('"n": 1');
        } finally {
            server.close();
        }
    });

    it('enforces maxBytes and marks truncated', async () => {
        const { default: tools } = await import('../skills/url_reader/tools.mjs');
        const readUrl = tools.find(t => t.name === 'read_url').func;

        const big = 'a'.repeat(10_000);
        const { server, baseUrl } = await startServer((req, res) => {
            if (req.url === '/big') {
                res.statusCode = 200;
                res.setHeader('content-type', 'text/plain');
                res.end(big);
                return;
            }
            res.statusCode = 404;
            res.end('nope');
        });

        try {
            const out = await readUrl({ url: `${baseUrl}/big`, maxBytes: 2000, mode: 'text' });
            expect(out.ok).toBe(true);
            expect(out.truncated).toBe(true);
            expect(out.bytes).toBeGreaterThan(0);
            expect(out.bytes).toBeLessThanOrEqual(2000);
            expect(out.text.length).toBeGreaterThan(0);
        } finally {
            server.close();
        }
    });

    it('rejects non-http(s) protocols', async () => {
        const { default: tools } = await import('../skills/url_reader/tools.mjs');
        const readUrl = tools.find(t => t.name === 'read_url').func;

        const out = await readUrl({ url: 'file:///etc/passwd' });
        expect(out.ok).toBe(false);
        expect(String(out.error)).toContain('Unsupported URL protocol');
    });

    it('returns a structured browser restriction error on Failed to fetch', async () => {
        const prevWindow = globalThis.window;
        const prevFetch = globalThis.fetch;

        try {
            globalThis.window = {};
            globalThis.fetch = async () => {
                throw new TypeError('Failed to fetch');
            };

            const { default: tools } = await import('../skills/url_reader/tools.mjs');
            const readUrl = tools.find(t => t.name === 'read_url').func;

            const out = await readUrl({ url: 'https://example.com' });
            expect(out.ok).toBe(false);
            expect(out.platform).toBe('browser');
            expect(String(out.error).toLowerCase()).toContain('environment restriction');
            expect(String(out.message).toLowerCase()).toContain('cors');
        } finally {
            if (prevWindow === undefined) delete globalThis.window;
            else globalThis.window = prevWindow;
            globalThis.fetch = prevFetch;
        }
    });
});
