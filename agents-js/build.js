
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');

// Copy utility for folders that must be preserved (e.g., Skills)
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
    console.log(`Copied dir: ${src} -> ${dest}`);
}

async function build() {
    console.log('Building project...');

    // 1. Clean dist
    if (fs.existsSync(DIST_DIR)) {
        fs.rmSync(DIST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(DIST_DIR);

    // 2. Bundle JS (index.js -> agents.js)
    // We bundle everything to a single file, targeting Node.js
    await esbuild.build({
        entryPoints: ['index.js'],
        bundle: true,
        platform: 'node',
        target: 'node18', // Adjust based on your target environment
        outfile: path.join(DIST_DIR, 'agents.js'),
        external: [
            '@xenova/transformers',
            // 'fsevents', // Exclude system-specific optionals if needed
        ],
        sourcemap: false,
        minify: true, // Minify for smaller size
        logLevel: 'info'
    });
    console.log('Bundled core logic to dist/agents.js');

    // 3. Copy Assets (Skills, .env, README)
    console.log('Copying assets...');

    // Skills must be preserved as files because they contain scripts executed by 'node script.js'
    copyDir(path.join(__dirname, 'skills'), path.join(DIST_DIR, 'skills'));

    fs.copyFileSync(path.join(__dirname, '.env'), path.join(DIST_DIR, '.env'));
    fs.copyFileSync(path.join(__dirname, 'README.md'), path.join(DIST_DIR, 'README.md'));

    // Optionally create a simplified package.json for the user to see/use instructions
    const pkg = {
        name: "agents-js-dist",
        version: "1.0.0",
        scripts: {
            "start": "node agents.js"
        },
        description: "Bundled Agent Framework"
    };
    fs.writeFileSync(path.join(DIST_DIR, 'package.json'), JSON.stringify(pkg, null, 2));

    console.log('\nBuild complete! Output in ./dist');
    console.log('To run: cd dist && node agents.js "your query"');
}

build().catch(err => {
    console.error(err);
    process.exit(1);
});
