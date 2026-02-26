#!/usr/bin/env node

'use strict';

const {
    analyzeTrace,
    formatReport,
    formatTimeline,
    loadTraceFromFile,
} = require('./trace_replay');

function parseFlags(argv) {
    const args = Array.isArray(argv) ? argv.slice(2) : [];
    const filePath = args.find(a => !String(a).startsWith('-')) || '';
    const flags = new Set(args.filter(a => String(a).startsWith('-')).map(String));
    return {
        filePath,
        help: flags.has('-h') || flags.has('--help'),
        timeline: flags.has('--timeline') || (!flags.has('--no-timeline')),
        timelineAll: flags.has('--timeline-all'),
    };
}

function main(argv) {
    const f = parseFlags(argv);
    if (f.help || !f.filePath) {
        process.stdout.write(
            'Usage:\n'
            + '  node scripts/trace_replay_poc.js <trace.json> [--timeline] [--no-timeline] [--timeline-all]\n\n'
            + 'Notes:\n'
            + '  - Read-only: does not call tools or mutate anything.\n'
            + '  - Default output includes a bounded timeline.\n'
        );
        return 0;
    }

    const loaded = loadTraceFromFile(f.filePath);
    if (!loaded.ok) {
        process.stderr.write(`Trace Replay PoC\n\nERROR: ${loaded.error || 'Failed to load trace'}\n`);
        return 2;
    }

    const analysis = analyzeTrace(loaded.value);
    process.stdout.write(formatReport(analysis));

    if (f.timeline) {
        const maxLines = f.timelineAll ? 10000 : 140;
        process.stdout.write(formatTimeline(loaded.value, { maxLines, includeChildren: true }));
    }

    return analysis && analysis.ok ? 0 : 2;
}

if (require.main === module) {
    const code = main(process.argv);
    process.exit(Number.isFinite(code) ? code : 1);
}
