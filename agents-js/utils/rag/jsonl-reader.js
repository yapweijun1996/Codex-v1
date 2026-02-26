const fs = require('fs');
const path = require('path');
const readline = require('readline');

function parseJsonLine(line, { filePath = '', lineNumber = 0 } = {}) {
    const text = String(line || '').trim();
    if (!text) return { value: null, error: null };
    try {
        return { value: JSON.parse(text), error: null };
    } catch (error) {
        return {
            value: null,
            error: {
                filePath,
                lineNumber,
                message: String(error && error.message ? error.message : error),
            },
        };
    }
}

async function readJsonlFile(filePath, options = {}) {
    const {
        onRecord = null,
        maxRecords = Number.POSITIVE_INFINITY,
        skipInvalid = true,
    } = options;

    const records = [];
    const errors = [];

    if (!filePath || !fs.existsSync(filePath)) {
        return { records, errors, totalLines: 0, parsedRecords: 0 };
    }

    let totalLines = 0;
    let parsedRecords = 0;

    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
        totalLines += 1;
        if (parsedRecords >= maxRecords) break;

        const parsed = parseJsonLine(line, { filePath, lineNumber: totalLines });
        if (parsed.error) {
            errors.push(parsed.error);
            if (!skipInvalid) {
                throw new Error(`Invalid JSONL at ${parsed.error.filePath}:${parsed.error.lineNumber} (${parsed.error.message})`);
            }
            continue;
        }
        if (!parsed.value) continue;

        parsedRecords += 1;
        if (typeof onRecord === 'function') {
            await onRecord(parsed.value, parsedRecords);
        } else {
            records.push(parsed.value);
        }
    }

    return { records, errors, totalLines, parsedRecords };
}

async function appendJsonlRecord(filePath, record) {
    const output = JSON.stringify(record);
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.appendFile(filePath, `${output}\n`, 'utf8');
}

module.exports = {
    appendJsonlRecord,
    parseJsonLine,
    readJsonlFile,
};
