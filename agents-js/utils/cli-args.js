const pc = require('picocolors');

function parseArgs(argv) {
    const out = { resume: false, help: false, debug: false, appNever: false, queryParts: [] };
    for (const arg of argv) {
        if (arg === '--resume' || arg === '-r') {
            out.resume = true;
            continue;
        }
        if (arg === '--help' || arg === '-h') {
            out.help = true;
            continue;
        }
        if (arg === '--debug' || arg === '-d') {
            out.debug = true;
            continue;
        }
        if (arg === '--app-never') {
            out.appNever = true;
            continue;
        }
        out.queryParts.push(arg);
    }
    return out;
}

function printHelp() {
    console.log(pc.bold('Usage:') + ' node cli.js [--resume|-r] ["<prompt>"]');
    console.log(pc.dim('  --resume: load ./agent_session.json to continue a prior session'));
    console.log(pc.dim('  --debug: show verbose agent logs'));
    console.log(pc.dim('  --app-never: set AGENTS_APPROVAL_POLICY=never for this run'));
    console.log(pc.bold('Commands:'));
    console.log('  /help   Show this help');
    console.log('  /trace  Export audit trace JSON');
    console.log('  /exit   Exit the session');
    console.log('  /quit   Exit the session');
    console.log('  /reset  Clear agent history');
    console.log('  /stats  Show basic session stats');
}

module.exports = {
    parseArgs,
    printHelp,
};
