const { normalizeToken, isEnvAssignmentToken } = require('./command-parser');

function looksLikeGitExecutable(cmd0) {
    return !!cmd0 && (cmd0.endsWith('git') || cmd0.endsWith('/git') || cmd0.endsWith('\\git'));
}

function isDangerousTokens(tokens) {
    const filtered = tokens.filter(Boolean);
    const t = filtered.map(normalizeToken).filter(Boolean);
    if (t.length === 0) return { dangerous: false };

    const unwrapLeadingWrappers = (raw, norm) => {
        let i = 0;
        if (norm[i] === 'sudo') {
            i++;
            if (i >= norm.length) return { dangerous: true, reason: 'sudo without command' };
        }
        if (norm[i] === 'env') {
            i++;
            while (i < norm.length && (norm[i].startsWith('-') || isEnvAssignmentToken(raw[i]))) i++;
        }
        return { raw: raw.slice(i), norm: norm.slice(i) };
    };

    const unwrapped = unwrapLeadingWrappers(filtered, t);
    if (unwrapped.dangerous) return { dangerous: true, reason: unwrapped.reason };
    const raw = unwrapped.raw;
    const n = unwrapped.norm;
    if (n.length === 0) return { dangerous: false };

    const first = n[0];

    // git reset / git rm
    if (looksLikeGitExecutable(first)) {
        const sub = n[1];
        if (sub === 'reset') return { dangerous: true, reason: 'git reset is restricted' };
        if (sub === 'rm') return { dangerous: true, reason: 'git rm is restricted' };
    }

    // rm -f / rm -rf / rm -r -f
    if (first === 'rm') {
        const flags = new Set(n.slice(1).filter(x => x.startsWith('-')));
        const hasF = flags.has('-f') || flags.has('-rf') || flags.has('-fr');
        const hasR = flags.has('-r') || flags.has('-rf') || flags.has('-fr') || flags.has('-rr') || flags.has('-rR');
        // Handle split flags: -r -f
        if (hasF) return { dangerous: true, reason: 'rm with force is restricted' };
        if (hasR && flags.has('-f')) return { dangerous: true, reason: 'rm -r -f is restricted' };
    }

    // chmod 777 (anywhere in token stream)
    if (first === 'chmod') {
        if (n.includes('777') || n.some(x => x === '-R' || x === '-r') && n.includes('777')) {
            return { dangerous: true, reason: 'chmod 777 is restricted' };
        }
    }

    // mkfs*, dd
    if (first.startsWith('mkfs')) return { dangerous: true, reason: 'mkfs is restricted' };
    if (first === 'dd') return { dangerous: true, reason: 'dd is restricted' };

    // Windows CMD destructive patterns (best-effort)
    if (first === 'del' || first === 'erase') {
        if (n.includes('/f')) return { dangerous: true, reason: 'del/erase with /f is restricted' };
    }
    if (first === 'rd' || first === 'rmdir') {
        if (n.includes('/s') && n.includes('/q')) return { dangerous: true, reason: 'rd/rmdir with /s /q is restricted' };
    }

    const interpreterFlagByCmd = {
        python: '-c',
        python3: '-c',
        py: '-c',
        node: '-e',
        perl: '-e',
        ruby: '-e',
        php: '-r',
    };
    const evalFlag = interpreterFlagByCmd[first];
    if (evalFlag) {
        const idx = n.findIndex((x) => x === evalFlag || (first === 'node' && x === '--eval'));
        if (idx !== -1 && raw[idx + 1]) {
            const payload = String(raw.slice(idx + 1).join(' ')).toLowerCase();
            const hasExecPrimitive = (
                payload.includes('os.system') ||
                payload.includes('subprocess') ||
                payload.includes('child_process') ||
                payload.includes('spawn(') ||
                payload.includes('exec(') ||
                payload.includes('popen(') ||
                payload.includes('system(')
            );
            const hasDangerousCommand = (
                /rm\s+-[^\n]*f/.test(payload) ||
                payload.includes('git reset') ||
                payload.includes('git rm') ||
                payload.includes('mkfs') ||
                /\bdd\s+if=/.test(payload) ||
                payload.includes('chmod 777')
            );
            if (hasExecPrimitive && hasDangerousCommand) {
                return { dangerous: true, reason: 'interpreter inline command execution is restricted' };
            }
        }
    }

    return { dangerous: false };
}

module.exports = { isDangerousTokens };
