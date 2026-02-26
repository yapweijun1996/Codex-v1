function isUnifiedDiff(lines) {
    for (let i = 0; i < lines.length; i += 1) {
        const line = String(lines[i] || '');
        if (line.startsWith('diff --git ')) return true;
        if (line.startsWith('--- ') && i + 1 < lines.length) {
            const next = String(lines[i + 1] || '');
            if (next.startsWith('+++ ')) return true;
        }
    }
    return false;
}

function parseUnifiedDiff(lines) {
    const ops = [];
    let idx = 0;

    const parseDiffPath = (line, prefix) => {
        if (!line.startsWith(prefix)) return null;
        const raw = line.slice(prefix.length).trim();
        if (raw === '/dev/null') return null;
        if (raw.startsWith('a/') || raw.startsWith('b/')) {
            return raw.slice(2);
        }
        return raw;
    };

    while (idx < lines.length) {
        let line = String(lines[idx] || '');
        if (!line) {
            idx += 1;
            continue;
        }

        let oldPath = null;
        let newPath = null;
        let isNew = false;
        let isDelete = false;
        let renameFrom = null;
        let renameTo = null;

        if (line.startsWith('diff --git ')) {
            const parts = line.split(' ').slice(2);
            if (parts.length >= 2) {
                oldPath = parts[0].startsWith('a/') ? parts[0].slice(2) : parts[0];
                newPath = parts[1].startsWith('b/') ? parts[1].slice(2) : parts[1];
            }
            idx += 1;
            while (idx < lines.length) {
                line = String(lines[idx] || '');
                if (line.startsWith('new file mode')) {
                    isNew = true;
                    idx += 1;
                    continue;
                }
                if (line.startsWith('deleted file mode')) {
                    isDelete = true;
                    idx += 1;
                    continue;
                }
                if (line.startsWith('rename from ')) {
                    renameFrom = line.slice('rename from '.length).trim();
                    idx += 1;
                    continue;
                }
                if (line.startsWith('rename to ')) {
                    renameTo = line.slice('rename to '.length).trim();
                    idx += 1;
                    continue;
                }
                if (line.startsWith('--- ')) {
                    break;
                }
                idx += 1;
            }
        }

        line = String(lines[idx] || '');
        if (line.startsWith('--- ')) {
            oldPath = parseDiffPath(line, '--- ') ?? oldPath;
            idx += 1;
            line = String(lines[idx] || '');
            if (!line.startsWith('+++ ')) {
                throw new Error('Unified diff missing +++ header');
            }
            newPath = parseDiffPath(line, '+++ ') ?? newPath;
            idx += 1;
        } else if (!line.startsWith('diff --git ')) {
            idx += 1;
            continue;
        }

        if (renameFrom) oldPath = renameFrom;
        if (renameTo) newPath = renameTo;

        if (!oldPath && !newPath) {
            throw new Error('Unified diff missing file paths');
        }

        if (oldPath === null) isNew = true;
        if (newPath === null) isDelete = true;

        const diffLines = [];
        while (idx < lines.length) {
            line = String(lines[idx] || '');
            if (line.startsWith('diff --git ')) break;
            if (line.startsWith('--- ') && idx + 1 < lines.length) {
                const next = String(lines[idx + 1] || '');
                if (next.startsWith('+++ ')) break;
            }
            if (line.startsWith('@@')) {
                idx += 1;
                continue;
            }
            if (line === '\\ No newline at end of file') {
                idx += 1;
                continue;
            }
            const prefix = line[0];
            if (prefix === ' ' || prefix === '+' || prefix === '-') {
                diffLines.push({ type: prefix, text: line.slice(1) });
                idx += 1;
                continue;
            }
            idx += 1;
        }

        if (isNew) {
            const contentLines = diffLines.filter((d) => d.type === '+').map((d) => d.text);
            if (contentLines.length === 0) {
                throw new Error('Unified diff add requires content');
            }
            ops.push({ type: 'add', path: newPath || oldPath, contentLines });
            continue;
        }

        if (isDelete) {
            ops.push({ type: 'delete', path: oldPath || newPath });
            continue;
        }

        if (diffLines.length === 0) {
            throw new Error('Unified diff update requires diff lines');
        }
        const movePath = oldPath && newPath && oldPath !== newPath ? newPath : null;
        ops.push({ type: 'update', path: oldPath || newPath, movePath, diffLines });
    }

    return ops;
}

module.exports = { isUnifiedDiff, parseUnifiedDiff };
