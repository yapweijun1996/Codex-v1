const fs = require('fs');
const path = require('path');
const { isUnifiedDiff, parseUnifiedDiff } = require('./apply-patch-unified');

function isPatchHeader(line) {
    return typeof line === 'string' && line.startsWith('*** ');
}

function normalizeHeader(line) {
    return String(line || '').trimEnd();
}

function resolveSafePath(cwd, relPath) {
    if (!relPath || typeof relPath !== 'string') {
        throw new Error('Invalid path');
    }
    if (path.isAbsolute(relPath)) {
        throw new Error('Absolute paths are not allowed');
    }
    const normalized = path.normalize(relPath);
    if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
        throw new Error('Path traversal is not allowed');
    }
    const abs = path.resolve(cwd, normalized);
    const cwdNormalized = path.resolve(cwd);
    if (abs !== cwdNormalized && !abs.startsWith(`${cwdNormalized}${path.sep}`)) {
        throw new Error('Path is outside workspace');
    }
    return abs;
}

function splitLines(text) {
    const raw = String(text || '');
    const useCrlf = raw.includes('\r\n');
    const eol = useCrlf ? '\r\n' : '\n';
    const lines = useCrlf ? raw.split(/\r\n/) : raw.split(/\n/);
    const hasTrailingNewline = raw.endsWith('\n');
    return { lines, eol, hasTrailingNewline };
}

function parsePatch(patchText) {
    const { lines } = splitLines(patchText);
    const ops = [];
    let idx = 0;

    if (isUnifiedDiff(lines)) {
        return parseUnifiedDiff(lines);
    }

    if (normalizeHeader(lines[idx]) !== '*** Begin Patch') {
        throw new Error('Patch must start with "*** Begin Patch"');
    }
    idx += 1;

    while (idx < lines.length) {
        const header = normalizeHeader(lines[idx]);
        if (!header) {
            idx += 1;
            continue;
        }
        if (header === '*** End Patch') {
            return ops;
        }
        if (header.startsWith('*** Add File: ')) {
            const relPath = header.slice('*** Add File: '.length).trim();
            idx += 1;
            const contentLines = [];
            while (idx < lines.length && !isPatchHeader(lines[idx])) {
                const line = lines[idx];
                if (!line.startsWith('+')) {
                    throw new Error('Add File lines must start with "+"');
                }
                contentLines.push(line.slice(1));
                idx += 1;
            }
            if (contentLines.length === 0) {
                throw new Error('Add File requires at least one line');
            }
            ops.push({ type: 'add', path: relPath, contentLines });
            continue;
        }
        if (header.startsWith('*** Delete File: ')) {
            const relPath = header.slice('*** Delete File: '.length).trim();
            idx += 1;
            ops.push({ type: 'delete', path: relPath });
            continue;
        }
        if (header.startsWith('*** Update File: ')) {
            const relPath = header.slice('*** Update File: '.length).trim();
            idx += 1;
            let movePath = null;
            if (idx < lines.length && normalizeHeader(lines[idx]).startsWith('*** Move to: ')) {
                movePath = normalizeHeader(lines[idx]).slice('*** Move to: '.length).trim();
                idx += 1;
            }
            const diffLines = [];
            while (idx < lines.length && !isPatchHeader(lines[idx])) {
                const line = lines[idx];
                if (line.startsWith('@@')) {
                    idx += 1;
                    continue;
                }
                if (line === '*** End of File') {
                    idx += 1;
                    continue;
                }
                const prefix = line[0];
                if (prefix === ' ' || prefix === '+' || prefix === '-') {
                    diffLines.push({ type: prefix, text: line.slice(1) });
                } else if (line.trim() === '') {
                    throw new Error('Update File lines must start with " ", "+", or "-"');
                } else {
                    throw new Error('Invalid Update File line');
                }
                idx += 1;
            }
            if (diffLines.length === 0) {
                throw new Error('Update File requires at least one diff line');
            }
            ops.push({ type: 'update', path: relPath, movePath, diffLines });
            continue;
        }
        throw new Error(`Unknown patch header: ${header}`);
    }

    throw new Error('Patch missing "*** End Patch"');
}

function applyDiffLines(lines, diffLines) {
    let cursor = 0;
    const out = Array.isArray(lines) ? lines.slice() : [];

    const findFrom = (start, text) => {
        for (let i = start; i < out.length; i += 1) {
            if (out[i] === text) return i;
        }
        return -1;
    };

    for (const diff of diffLines) {
        if (diff.type === ' ') {
            const idx = out[cursor] === diff.text ? cursor : findFrom(cursor, diff.text);
            if (idx === -1) {
                throw new Error(`Context line not found: ${diff.text}`);
            }
            cursor = idx + 1;
            continue;
        }
        if (diff.type === '-') {
            const idx = out[cursor] === diff.text ? cursor : findFrom(cursor, diff.text);
            if (idx === -1) {
                throw new Error(`Removal line not found: ${diff.text}`);
            }
            out.splice(idx, 1);
            cursor = idx;
            continue;
        }
        if (diff.type === '+') {
            out.splice(cursor, 0, diff.text);
            cursor += 1;
            continue;
        }
        throw new Error('Unknown diff operation');
    }
    return out;
}

function ensureDirFor(filePath) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
}

function readFileLines(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { lines, eol, hasTrailingNewline } = splitLines(raw);
    if (hasTrailingNewline && lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
    }
    return { lines, eol, hasTrailingNewline };
}

function writeFileLines(filePath, lines, eol, keepTrailing) {
    let content = lines.join(eol);
    if (keepTrailing) {
        content += eol;
    }
    fs.writeFileSync(filePath, content, 'utf8');
}

function applyPatch({ input, cwd }) {
    const baseDir = cwd || process.cwd();
    const ops = parsePatch(input);
    const results = [];

    for (const op of ops) {
        if (op.type === 'add') {
            const abs = resolveSafePath(baseDir, op.path);
            if (fs.existsSync(abs)) {
                throw new Error(`File already exists: ${op.path}`);
            }
            ensureDirFor(abs);
            const content = op.contentLines.join('\n') + '\n';
            fs.writeFileSync(abs, content, 'utf8');
            results.push({ action: 'add', path: op.path, status: 'added' });
            continue;
        }
        if (op.type === 'delete') {
            const abs = resolveSafePath(baseDir, op.path);
            if (!fs.existsSync(abs)) {
                throw new Error(`File not found: ${op.path}`);
            }
            fs.unlinkSync(abs);
            results.push({ action: 'delete', path: op.path, status: 'deleted' });
            continue;
        }
        if (op.type === 'update') {
            const abs = resolveSafePath(baseDir, op.path);
            if (!fs.existsSync(abs)) {
                throw new Error(`File not found: ${op.path}`);
            }
            const { lines, eol, hasTrailingNewline } = readFileLines(abs);
            const updated = applyDiffLines(lines, op.diffLines);
            writeFileLines(abs, updated, eol, hasTrailingNewline);

            if (op.movePath) {
                const dest = resolveSafePath(baseDir, op.movePath);
                if (dest !== abs) {
                    ensureDirFor(dest);
                    fs.renameSync(abs, dest);
                    results.push({ action: 'move', from: op.path, to: op.movePath, status: 'moved' });
                    continue;
                }
            }
            results.push({ action: 'update', path: op.path, status: 'updated' });
            continue;
        }
        throw new Error(`Unsupported operation: ${op.type}`);
    }

    return {
        ok: true,
        applied: results,
    };
}

module.exports = { applyPatch };
