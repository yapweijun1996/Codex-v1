#!/usr/bin/env node

const { execSync, spawn } = require('child_process');

const PORT = 5500;
const isDryRun = process.argv.includes('--dry-run');

function run(command) {
    return execSync(command, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
}

function getPortPids(port) {
    try {
        const out = run(`lsof -ti tcp:${port}`);
        if (!out) return [];
        return out
            .split('\n')
            .map((line) => Number(String(line).trim()))
            .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
    } catch {
        return [];
    }
}

function killPids(pids) {
    if (!Array.isArray(pids) || pids.length === 0) return;
    for (const pid of pids) {
        try {
            process.kill(pid, 'SIGTERM');
        } catch {
            // Ignore processes that already exited.
        }
    }
    // Give processes a short grace window before forcing exit.
    try {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    } catch {
        // no-op
    }
    for (const pid of pids) {
        try {
            process.kill(pid, 0);
            process.kill(pid, 'SIGKILL');
        } catch {
            // Process already exited or cannot be signaled.
        }
    }
}

function startPreview() {
    const args = ['-y', 'serve', 'browser', '-p', String(PORT)];
    const child = spawn('npx', args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
    });

    const forwardSignal = (signal) => {
        if (child && !child.killed) {
            try {
                child.kill(signal);
            } catch {
                // no-op
            }
        }
    };

    process.on('SIGINT', () => forwardSignal('SIGINT'));
    process.on('SIGTERM', () => forwardSignal('SIGTERM'));

    child.on('exit', (code) => {
        process.exit(typeof code === 'number' ? code : 0);
    });
}

const pids = getPortPids(PORT);

if (pids.length > 0) {
    console.log(`[preview] Releasing port ${PORT} (pid: ${pids.join(', ')})`);
    if (!isDryRun) {
        killPids(pids);
    }
} else {
    console.log(`[preview] Port ${PORT} is free.`);
}

if (isDryRun) {
    console.log(`[preview] Dry run complete. Would start: npx -y serve browser -p ${PORT}`);
    process.exit(0);
}

console.log(`[preview] Starting browser preview on http://localhost:${PORT}`);
startPreview();
