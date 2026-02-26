function normalizeToken(token) {
    return (token || '').trim().toLowerCase();
}

function isEnvAssignmentToken(token) {
    const t = String(token || '').trim();
    if (!t) return false;
    if (t.startsWith('-')) return false;
    const idx = t.indexOf('=');
    if (idx <= 0) return false;
    return idx < t.length - 1;
}

function splitCommandSegments(input) {
    const s = String(input || '');
    const segments = [];
    let buf = '';
    let quote = null; // '\'' | '"' | null
    let escape = false;

    const push = () => {
        const out = buf.trim();
        if (out) segments.push(out);
        buf = '';
    };

    for (let i = 0; i < s.length; i++) {
        const ch = s[i];

        if (escape) {
            buf += ch;
            escape = false;
            continue;
        }

        if (ch === '\\') {
            // Keep escapes; only treat as escape outside single quotes.
            if (quote !== "'") {
                escape = true;
            }
            buf += ch;
            continue;
        }

        if (quote) {
            buf += ch;
            if (ch === quote) quote = null;
            continue;
        }

        if (ch === '"' || ch === "'") {
            quote = ch;
            buf += ch;
            continue;
        }

        // separators outside quotes
        if (ch === ';' || ch === '\n' || ch === '\r') {
            push();
            continue;
        }

        if (ch === '&' && s[i + 1] === '&') {
            push();
            i++;
            continue;
        }

        if (ch === '|' && s[i + 1] === '|') {
            push();
            i++;
            continue;
        }

        if (ch === '|') {
            push();
            continue;
        }

        buf += ch;
    }

    push();
    return segments;
}

function scanUnsafeOperators(command) {
    const s = String(command || '');
    let quote = null;
    let escape = false;

    const isShellName = (name) => {
        const n = normalizeToken(name);
        if (!n) return false;
        if (n === 'sh' || n === 'bash' || n === 'zsh') return true;
        if (n === 'powershell' || n === 'powershell.exe' || n === 'pwsh' || n === 'pwsh.exe') return true;
        return false;
    };

    const basename = (p) => {
        const raw = String(p || '');
        const parts = raw.split(/[\\/]/).filter(Boolean);
        return parts.length ? parts[parts.length - 1] : raw;
    };

    const readWord = (startIdx) => {
        let i = startIdx;
        while (i < s.length && /\s/.test(s[i])) i++;
        let j = i;
        while (j < s.length && !/\s/.test(s[j]) && !['|', '&', ';', '>', '<', '\n', '\r'].includes(s[j])) j++;
        return { word: s.slice(i, j), next: j };
    };

    for (let i = 0; i < s.length; i++) {
        const ch = s[i];

        if (escape) {
            escape = false;
            continue;
        }

        if (ch === '\\') {
            if (quote !== "'") escape = true;
            continue;
        }

        if (quote) {
            if (ch === quote) quote = null;
            continue;
        }

        if (ch === '"' || ch === "'") {
            quote = ch;
            continue;
        }

        // Redirection to absolute POSIX paths, e.g. > /etc/passwd, >>/root/x
        if (ch === '>') {
            let j = i + 1;
            if (s[j] === '>') j++;
            while (j < s.length && /\s/.test(s[j])) j++;
            if (s[j] === '/') {
                return { safe: false, reason: 'redirection to absolute path is restricted' };
            }
            continue;
        }

        // Pipe-to-shell, e.g. curl ... | sh
        if (ch === '|') {
            if (s[i + 1] === '|') {
                i++;
                continue;
            }
            const first = readWord(i + 1);
            let next = first.next;
            const firstName = basename(first.word);
            if (isShellName(firstName)) {
                return { safe: false, reason: 'piping into a shell is restricted' };
            }

            // Handle wrappers like: curl ... | env sh
            if (normalizeToken(firstName) === 'env') {
                let second = readWord(next);
                next = second.next;
                while (second.word && (normalizeToken(second.word).startsWith('-') || isEnvAssignmentToken(second.word))) {
                    second = readWord(next);
                    next = second.next;
                }
                const secondName = basename(second.word);
                if (isShellName(secondName)) {
                    return { safe: false, reason: 'piping into a shell is restricted' };
                }
            }

            i = next - 1;
            continue;
        }
    }

    return { safe: true };
}

function splitArgv(input) {
    const s = String(input || '').trim();
    if (!s) return [];

    const out = [];
    let buf = '';
    let quote = null;
    let escape = false;

    const push = () => {
        if (buf.length) out.push(buf);
        buf = '';
    };

    for (let i = 0; i < s.length; i++) {
        const ch = s[i];

        if (escape) {
            buf += ch;
            escape = false;
            continue;
        }

        if (ch === '\\') {
            if (quote !== "'") {
                escape = true;
            }
            continue;
        }

        if (quote) {
            if (ch === quote) {
                quote = null;
            } else {
                buf += ch;
            }
            continue;
        }

        if (ch === '"' || ch === "'") {
            quote = ch;
            continue;
        }

        if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
            if (buf.length) push();
            continue;
        }

        buf += ch;
    }

    if (buf.length) push();
    return out;
}

function isShellWrapper(tokens) {
    const filtered = tokens.filter(Boolean);
    const t = filtered.map(normalizeToken).filter(Boolean);
    let cmd0 = t[0];
    if (!cmd0) return null;

    // Support wrappers like: env FOO=bar bash -c "..."
    let tokenBase = filtered;
    let tBase = t;
    if (cmd0 === 'env') {
        let idx = 1;
        while (idx < tBase.length) {
            const tk = tBase[idx];
            if (tk.startsWith('-') || isEnvAssignmentToken(tokenBase[idx])) {
                idx++;
                continue;
            }
            break;
        }
        if (idx >= tBase.length) return null;
        tokenBase = tokenBase.slice(idx);
        tBase = tBase.slice(idx);
        cmd0 = tBase[0];
    }

    if (cmd0 === 'bash' || cmd0 === 'zsh' || cmd0 === 'sh') {
        const idx = tBase.findIndex((x) => x === '-c' || x === '-lc');
        if (idx !== -1 && tokenBase[idx + 1]) {
            const payload = tokenBase.slice(idx + 1).join(' ');
            if (payload) return { payload };
        }
    }

    if (cmd0 === 'cmd' || cmd0 === 'cmd.exe') {
        const idx = tBase.findIndex(x => x === '/c' || x === '/r' || x === '-c');
        if (idx !== -1) {
            const payload = tokenBase.slice(idx + 1).join(' ');
            if (payload) return { payload };
        }
    }

    if (cmd0 === 'powershell' || cmd0 === 'powershell.exe' || cmd0 === 'pwsh' || cmd0 === 'pwsh.exe') {
        const idx = tBase.findIndex((x) => x === '-command' || x === '/command' || x === '-c');
        if (idx !== -1 && tokenBase[idx + 1]) {
            const payload = tokenBase.slice(idx + 1).join(' ');
            if (payload) return { payload };
        }
    }

    return null;
}

module.exports = {
    normalizeToken,
    isEnvAssignmentToken,
    splitCommandSegments,
    scanUnsafeOperators,
    splitArgv,
    isShellWrapper,
};
