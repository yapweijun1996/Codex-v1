const fs = require('fs');
const os = require('os');
const path = require('path');
const { readJsonlFile } = require('../utils/rag/jsonl-reader');

describe('rag jsonl reader', () => {
    it('reads large jsonl line with base64 image payload', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-jsonl-'));
        const file = path.join(dir, 'data.jsonl');
        const huge = 'A'.repeat(12000);
        const record = {
            id: 'r1',
            type: 'note',
            title: 't',
            content: 'c',
            images: [{ mime_type: 'image/jpeg', data: huge, source_page_index: 1 }],
            embedding: { model: 'Xenova/all-MiniLM-L6-v2', dimension: 384, vector: new Array(384).fill(0) },
        };
        fs.writeFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');

        const out = await readJsonlFile(file);
        expect(out.errors).toHaveLength(0);
        expect(out.records).toHaveLength(1);
        expect(out.records[0].images[0].data.length).toBe(12000);
    });

    it('skips invalid lines when skipInvalid=true', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-jsonl-'));
        const file = path.join(dir, 'data.jsonl');
        fs.writeFileSync(file, '{"id":"ok","content":"a"}\n{bad json}\n{"id":"ok2","content":"b"}\n', 'utf8');

        const out = await readJsonlFile(file, { skipInvalid: true });
        expect(out.records).toHaveLength(2);
        expect(out.errors.length).toBeGreaterThanOrEqual(1);
    });
});
