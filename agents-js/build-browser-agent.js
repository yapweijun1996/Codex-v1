// Build script: produce a browser-importable ESM bundle for the core Agent.
//
// Output: browser/agents.mjs
// - Keeps browser mode vanilla (no Node core deps)
// - Aliases Node's "events" to our minimal browser emitter

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const OUT_BUNDLE = path.join(__dirname, 'browser', 'agents.bundle.mjs');
const OUT_WRAPPER = path.join(__dirname, 'browser', 'agents.mjs');

function aliasPlugin(aliases) {
    return {
        name: 'alias',
        setup(build) {
            build.onResolve({ filter: /.*/ }, (args) => {
                if (Object.prototype.hasOwnProperty.call(aliases, args.path)) {
                    return { path: aliases[args.path] };
                }
                return null;
            });
        },
    };
}

async function buildBrowserAgent() {
    const emitterPath = path.join(__dirname, 'utils', 'emitter.js');
    const agentEntry = path.join(__dirname, 'agents.js');

    await esbuild.build({
        entryPoints: [agentEntry],
        bundle: true,
        format: 'esm',
        platform: 'browser',
        target: ['es2020'],
        outfile: OUT_BUNDLE,
        sourcemap: true,
        minify: false,
        logLevel: 'info',
        plugins: [
            aliasPlugin({
                events: emitterPath,
                'node:events': emitterPath,
            }),
        ],
    });

    // The core codebase is CommonJS (module.exports). When bundled as ESM, esbuild will
    // expose it as a default export. Create a tiny ESM wrapper that provides named exports
    // for browser ergonomics: `import { Agent } from './agents.mjs'`.
    const wrapper = [
        "import pkg from './agents.bundle.mjs';",
        "export const Agent = pkg && pkg.Agent ? pkg.Agent : undefined;",
        "export default pkg;",
        '',
    ].join('\n');
    fs.writeFileSync(OUT_WRAPPER, wrapper, 'utf8');
}

buildBrowserAgent().catch((err) => {
    console.error('[build-browser-agent] Build failed:', err);
    process.exit(1);
});
