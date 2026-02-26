const fs = require('fs');
const os = require('os');
const path = require('path');

const tools = require('../skills/file_tools/tools');

function getTool(name) {
    return tools.find((tool) => tool.name === name).func;
}

describe('file_tools skill', () => {
    it('lists directories and greps files', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-tools-'));
        const subDir = path.join(tempDir, 'sub');
        fs.mkdirSync(subDir);
        fs.writeFileSync(path.join(tempDir, 'a.txt'), 'hello world\nsecond line');
        fs.writeFileSync(path.join(subDir, 'b.log'), 'match me');

        try {
            const listDir = getTool('list_dir');
            const listed = await listDir({ path: tempDir, recursive: true, max_depth: 2 });
            const paths = listed.entries.map((e) => e.path);
            expect(paths).toContain(path.join(tempDir, 'a.txt'));
            expect(paths).toContain(path.join(subDir, 'b.log'));

            const grepFiles = getTool('grep_files');
            const result = await grepFiles({
                path: tempDir,
                pattern: 'match',
                include: '\\.log$'
            });
            expect(result.matches.length).toBe(1);
            expect(result.matches[0].path).toBe(path.join(subDir, 'b.log'));
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('reads files with offset and limit', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-tools-read-'));
        const filePath = path.join(tempDir, 'note.txt');
        fs.writeFileSync(filePath, 'alpha\nbeta\ngamma\n');

        try {
            const readFile = getTool('read_file');
            const res = await readFile({ path: filePath, offset: 2, limit: 2 });
            expect(res.lines).toEqual(['L2: beta', 'L3: gamma']);
            expect(res.truncated).toBe(false);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('reads images as base64', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-tools-image-'));
        const filePath = path.join(tempDir, 'tiny.png');
        const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6f1Q3QAAAAASUVORK5CYII=';
        fs.writeFileSync(filePath, Buffer.from(pngBase64, 'base64'));

        try {
            const viewImage = getTool('view_image');
            const res = await viewImage({ path: filePath, max_file_size_bytes: 10000 });
            expect(res.mime_type).toBe('image/png');
            expect(res.data_base64).toBe(pngBase64);
            expect(res.byte_length).toBeGreaterThan(0);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('returns a browser environment restriction error', async () => {
        const prevWindow = global.window;
        global.window = {};
        try {
            const listDir = getTool('list_dir');
            const res = await listDir({ path: '.' });
            expect(res).toHaveProperty('error', 'Environment restriction');
            expect(res).toHaveProperty('platform', 'browser');
        } finally {
            global.window = prevWindow;
        }
    });
});
