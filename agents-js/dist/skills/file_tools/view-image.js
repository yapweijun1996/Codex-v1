const MIME_BY_EXT = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
};

async function viewImageCore({
    path: targetPath,
    max_file_size_bytes: maxFileSize = 2097152,
} = {}) {
    if (!targetPath) return { error: 'Missing path', message: 'path is required.' };

    const fs = require('fs');
    const path = require('path');

    let stat;
    try {
        stat = await fs.promises.stat(targetPath);
    } catch (error) {
        return { error: 'File not found', message: String(error && error.message ? error.message : error) };
    }

    if (!stat.isFile()) {
        return { error: 'Invalid file', message: 'path must point to a file.' };
    }

    const maxSize = Number.isFinite(Number(maxFileSize)) ? Math.max(1, Number(maxFileSize)) : 2097152;
    if (stat.size > maxSize) {
        return { error: 'File too large', message: `max_file_size_bytes is ${maxSize}` };
    }

    let buffer;
    try {
        buffer = await fs.promises.readFile(targetPath);
    } catch (error) {
        return { error: 'Read failed', message: String(error && error.message ? error.message : error) };
    }

    const ext = path.extname(targetPath).toLowerCase();
    const mimeType = MIME_BY_EXT[ext] || 'application/octet-stream';

    return {
        mime_type: mimeType,
        data_base64: buffer.toString('base64'),
        byte_length: buffer.length,
    };
}

module.exports = { viewImageCore };
