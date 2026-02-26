function isBrowserRuntime() {
    return typeof window !== 'undefined';
}

function nodeOnlyError() {
    return {
        error: 'Environment restriction',
        platform: 'browser',
        message: 'This tool is only available in Node.js. Use a server-side run or a proxy tool.',
    };
}

const { readFileCore } = require('./read-file');
const { viewImageCore } = require('./view-image');
const { RiskLevel } = require('../../utils/imda-constants');

async function listDir({
    path: targetPath = '.',
    recursive = false,
    max_depth: maxDepth = 3,
    include_files: includeFiles = true,
    include_dirs: includeDirs = true,
    include_hidden: includeHidden = false,
    limit = 200,
} = {}) {
    if (isBrowserRuntime()) return nodeOnlyError();

    const fs = require('fs');
    const path = require('path');

    const results = [];
    const errors = [];
    const max = Number.isFinite(Number(limit)) ? Math.max(1, Number(limit)) : 200;
    const depthCap = Number.isFinite(Number(maxDepth)) ? Math.max(0, Number(maxDepth)) : 3;

    const stack = [{ dir: targetPath, depth: 0 }];
    while (stack.length > 0 && results.length < max) {
        const { dir, depth } = stack.pop();
        let entries;
        try {
            entries = await fs.promises.readdir(dir, { withFileTypes: true });
        } catch (error) {
            errors.push({ path: dir, error: String(error && error.message ? error.message : error) });
            continue;
        }

        for (const entry of entries) {
            if (results.length >= max) break;
            if (!includeHidden && entry.name.startsWith('.')) continue;

            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (includeDirs) results.push({ path: fullPath, type: 'dir' });
                if (recursive && depth < depthCap) {
                    stack.push({ dir: fullPath, depth: depth + 1 });
                }
            } else if (entry.isFile()) {
                if (includeFiles) results.push({ path: fullPath, type: 'file' });
            } else {
                results.push({ path: fullPath, type: 'other' });
            }
        }
    }

    return {
        entries: results,
        truncated: results.length >= max,
        errors: errors.length > 0 ? errors : undefined,
    };
}

function buildRegex(pattern, flags) {
    try {
        return new RegExp(pattern, flags || undefined);
    } catch (error) {
        return { error: String(error && error.message ? error.message : error) };
    }
}

async function grepFiles({
    path: targetPath = '.',
    pattern,
    flags = '',
    include,
    recursive = true,
    max_depth: maxDepth = 5,
    max_matches: maxMatches = 50,
    max_file_size_bytes: maxFileSize = 524288,
    include_hidden: includeHidden = false,
} = {}) {
    if (isBrowserRuntime()) return nodeOnlyError();
    if (!pattern) return { error: 'Missing pattern', message: 'pattern is required.' };

    const fs = require('fs');
    const path = require('path');

    const regex = buildRegex(pattern, flags);
    if (regex && regex.error) return { error: 'Invalid pattern', message: regex.error };
    const includeRegex = include ? buildRegex(include) : null;
    if (includeRegex && includeRegex.error) return { error: 'Invalid include pattern', message: includeRegex.error };

    const matches = [];
    const errors = [];
    const max = Number.isFinite(Number(maxMatches)) ? Math.max(1, Number(maxMatches)) : 50;
    const depthCap = Number.isFinite(Number(maxDepth)) ? Math.max(0, Number(maxDepth)) : 5;
    const maxSize = Number.isFinite(Number(maxFileSize)) ? Math.max(1, Number(maxFileSize)) : 524288;

    const stack = [{ dir: targetPath, depth: 0 }];
    while (stack.length > 0 && matches.length < max) {
        const { dir, depth } = stack.pop();
        let entries;
        try {
            entries = await fs.promises.readdir(dir, { withFileTypes: true });
        } catch (error) {
            errors.push({ path: dir, error: String(error && error.message ? error.message : error) });
            continue;
        }

        for (const entry of entries) {
            if (matches.length >= max) break;
            if (!includeHidden && entry.name.startsWith('.')) continue;

            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (recursive && depth < depthCap) {
                    stack.push({ dir: fullPath, depth: depth + 1 });
                }
                continue;
            }

            if (!entry.isFile()) continue;
            if (includeRegex && !includeRegex.test(fullPath)) continue;

            let stat;
            try {
                stat = await fs.promises.stat(fullPath);
            } catch (error) {
                errors.push({ path: fullPath, error: String(error && error.message ? error.message : error) });
                continue;
            }
            if (stat.size > maxSize) continue;

            let content;
            try {
                content = await fs.promises.readFile(fullPath, 'utf8');
            } catch (error) {
                errors.push({ path: fullPath, error: String(error && error.message ? error.message : error) });
                continue;
            }

            const lines = content.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
                if (matches.length >= max) break;
                const line = lines[i];
                if (regex.test(line)) {
                    matches.push({
                        path: fullPath,
                        line: i + 1,
                        text: line,
                    });
                }
                if (regex.global) regex.lastIndex = 0;
            }
        }
    }

    return {
        matches,
        truncated: matches.length >= max,
        errors: errors.length > 0 ? errors : undefined,
    };
}

async function readFile(params = {}) {
    if (isBrowserRuntime()) return nodeOnlyError();
    return readFileCore(params);
}

async function viewImage(params = {}) {
    if (isBrowserRuntime()) return nodeOnlyError();
    return viewImageCore(params);
}

module.exports = [
    {
        name: 'list_dir',
        description: 'List directory entries with optional recursion and limits (Node-only).',
        risk: RiskLevel.MEDIUM,
        meta: {
            intentTemplate: 'list dir {path}',
        },
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Directory path (default: current directory).' },
                recursive: { type: 'boolean', description: 'Whether to list recursively.' },
                max_depth: { type: 'number', description: 'Maximum recursion depth.' },
                include_files: { type: 'boolean', description: 'Include files in results.' },
                include_dirs: { type: 'boolean', description: 'Include directories in results.' },
                include_hidden: { type: 'boolean', description: 'Include dotfiles and dot directories.' },
                limit: { type: 'number', description: 'Maximum number of entries.' },
            },
        },
        func: listDir,
    },
    {
        name: 'grep_files',
        description: 'Search file contents with a regex pattern (Node-only).',
        risk: RiskLevel.MEDIUM,
        meta: {
            intentTemplate: 'search files for "{pattern}"',
        },
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Root directory to search.' },
                pattern: { type: 'string', description: 'Regex pattern to search for.' },
                flags: { type: 'string', description: 'Regex flags (e.g. "i").' },
                include: { type: 'string', description: 'Optional regex to filter file paths.' },
                recursive: { type: 'boolean', description: 'Whether to search recursively.' },
                max_depth: { type: 'number', description: 'Maximum recursion depth.' },
                max_matches: { type: 'number', description: 'Maximum number of matches to return.' },
                max_file_size_bytes: { type: 'number', description: 'Skip files larger than this size.' },
                include_hidden: { type: 'boolean', description: 'Include dotfiles and dot directories.' },
            },
            required: ['pattern'],
        },
        func: grepFiles,
    },
    {
        name: 'read_file',
        description: 'Read a text file with line offsets and limits (Node-only).',
        risk: RiskLevel.MEDIUM,
        meta: {
            intentTemplate: 'read file {path}',
        },
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'File path to read.' },
                offset: { type: 'number', description: '1-indexed line number to start from.' },
                limit: { type: 'number', description: 'Maximum number of lines to return.' },
                max_file_size_bytes: { type: 'number', description: 'Skip files larger than this size.' },
            },
            required: ['path'],
        },
        func: readFile,
    },
    {
        name: 'view_image',
        description: 'Read a local image and return base64 data (Node-only).',
        risk: RiskLevel.MEDIUM,
        meta: {
            intentTemplate: 'view image {path}',
        },
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Image file path to read.' },
                max_file_size_bytes: { type: 'number', description: 'Skip files larger than this size.' },
            },
            required: ['path'],
        },
        func: viewImage,
    },
];
