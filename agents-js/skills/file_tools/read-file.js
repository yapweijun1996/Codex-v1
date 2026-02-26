function normalizeReadLines(raw) {
    const text = String(raw || '');
    const useCrlf = text.includes('\r\n');
    const lines = useCrlf ? text.split(/\r\n/) : text.split(/\n/);
    if (text.endsWith('\n') && lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
    }
    return lines;
}

async function readFileCore({
    path: targetPath,
    offset = 1,
    limit = 2000,
    max_file_size_bytes: maxFileSize = 524288,
} = {}) {
    if (!targetPath) return { error: 'Missing path', message: 'path is required.' };

    const start = Number(offset);
    const count = Number(limit);
    if (!Number.isFinite(start) || start < 1) {
        return { error: 'Invalid offset', message: 'offset must be a 1-indexed line number.' };
    }
    if (!Number.isFinite(count) || count < 1) {
        return { error: 'Invalid limit', message: 'limit must be greater than zero.' };
    }

    const fs = require('fs');

    let stat;
    try {
        stat = await fs.promises.stat(targetPath);
    } catch (error) {
        return { error: 'File not found', message: String(error && error.message ? error.message : error) };
    }

    if (!stat.isFile()) {
        return { error: 'Invalid file', message: 'path must point to a file.' };
    }

    const maxSize = Number.isFinite(Number(maxFileSize)) ? Math.max(1, Number(maxFileSize)) : 524288;
    if (stat.size > maxSize) {
        return { error: 'File too large', message: `max_file_size_bytes is ${maxSize}` };
    }

    let content;
    try {
        content = await fs.promises.readFile(targetPath, 'utf8');
    } catch (error) {
        return { error: 'Read failed', message: String(error && error.message ? error.message : error) };
    }

    const lines = normalizeReadLines(content);
    const startIndex = start - 1;
    if (startIndex >= lines.length) {
        return { error: 'Offset exceeds file length', message: 'offset exceeds file length.' };
    }

    const endIndex = Math.min(startIndex + count, lines.length);
    const numbered = [];
    for (let i = startIndex; i < endIndex; i += 1) {
        numbered.push(`L${i + 1}: ${lines[i]}`);
    }

    return {
        lines: numbered,
        truncated: endIndex < lines.length,
    };
}

module.exports = { readFileCore };
