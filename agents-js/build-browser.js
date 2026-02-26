/**
 * Build script for browser edition
 * 
 * This script:
 * 1. Scans the skills/ directory
 * 2. Clones skills into browser/skills
 * 3. Generates skills-manifest.json (including tool declarations)
 * 4. Generates a single-file browser edition
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const SKILLS_DIR = path.join(__dirname, 'skills');
const BROWSER_DIR = path.join(__dirname, 'browser');
const BROWSER_SKILLS_DEST = path.join(BROWSER_DIR, 'skills');
const BROWSER_TEMPLATE = path.join(BROWSER_DIR, 'standalone.html');
const BROWSER_OUTPUT = path.join(BROWSER_DIR, 'standalone-built.html');

/**
 * Recursevely copy directory
 */
function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

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
}

function listKnowledgeFiles(skillPath, skillName) {
    const knowledgeRoot = path.join(skillPath, 'knowledge');
    if (!fs.existsSync(knowledgeRoot)) return [];

    const out = [];
    const stack = [knowledgeRoot];
    while (stack.length > 0) {
        const cur = stack.pop();
        const entries = fs.readdirSync(cur, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(cur, entry.name);
            if (entry.isDirectory()) {
                stack.push(full);
                continue;
            }
            if (!entry.isFile()) continue;
            if (!entry.name.toLowerCase().endsWith('.jsonl')) continue;
            const rel = path.relative(skillPath, full).split(path.sep).join('/');
            out.push(`./skills/${skillName}/${rel}`);
        }
    }
    out.sort();
    return out;
}

console.log('🔨 Building browser edition with physical skills...\n');

async function loadToolsManifest(toolsEsmPath) {
    try {
        const fileUrl = pathToFileURL(toolsEsmPath).href;
        const mod = await import(fileUrl);
        const defs = mod && (mod.default || mod.tools);
        if (!Array.isArray(defs)) return [];

        return defs
            .filter(t => t && t.name && t.parameters)
            .map(t => ({
                name: t.name,
                description: t.description || '',
                parameters: t.parameters
            }));
    } catch (error) {
        console.warn(`  ⚠️  Failed to import tools.mjs: ${toolsEsmPath} (${error.message})`);
        return [];
    }
}

// ============================================
// Main build
// ============================================

async function buildBrowserEdition() {
    // 0. Physical Clone Skills
    console.log(`📂 Cloning skills to browser/skills/...`);
    if (fs.existsSync(BROWSER_SKILLS_DEST)) {
        fs.rmSync(BROWSER_SKILLS_DEST, { recursive: true, force: true });
    }
    copyDir(SKILLS_DIR, BROWSER_SKILLS_DEST);

    // Read template
    let html = fs.readFileSync(BROWSER_TEMPLATE, 'utf-8');

    // Add build timestamp
    const timestamp = new Date().toISOString();
    html = html.replace(
        '<title>agents-js - Browser Edition</title>',
        `<title>agents-js - Browser Edition (Built ${timestamp})</title>`
    );

    // 5. Generate Manifest for Frontend
    const manifest = [];
    if (!fs.existsSync(SKILLS_DIR)) {
        console.warn('⚠️  Skills directory not found');
    } else {
        const skillDirs = fs.readdirSync(SKILLS_DIR);

        for (const skillName of skillDirs) {
            const skillPath = path.join(SKILLS_DIR, skillName);
            const readmePath = path.join(skillPath, 'SKILL.md');
            const toolsEsmPath = path.join(skillPath, 'tools.mjs');

            // Skip if neither tools nor docs exist
            if (!fs.existsSync(readmePath) && !fs.existsSync(toolsEsmPath)) {
                continue;
            }

            const tools = fs.existsSync(toolsEsmPath)
                ? await loadToolsManifest(toolsEsmPath)
                : [];
            const knowledgeFiles = listKnowledgeFiles(skillPath, skillName);

            const hasTools = tools.length > 0;
            console.log(`  ✓ Found skill: ${skillName} (${tools.length} ESM tool(s), ${knowledgeFiles.length} knowledge file(s))`);

            manifest.push({
                id: skillName,
                name: skillName.replace(/_/g, ' ').toUpperCase(),
                path: `./skills/${skillName}/SKILL.md`,
                hasTools,
                toolsModule: hasTools ? `./skills/${skillName}/tools.mjs` : null,
                tools,
                knowledgeFiles,
            });
        }
    }

    fs.writeFileSync(path.join(BROWSER_DIR, 'skills-manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`📄 Generated skills-manifest.json`);

    // Write output
    fs.writeFileSync(BROWSER_OUTPUT, html, 'utf-8');

    console.log(`✅ Browser edition built successfully!`);
    console.log(`📄 Output: ${BROWSER_OUTPUT}`);
    const toolCount = manifest.reduce((n, s) => n + ((s.tools && s.tools.length) || 0), 0);
    console.log(`📊 Total tools: ${toolCount}`);
    console.log(`\n🚀 You can now open ${BROWSER_OUTPUT} in your browser!`);
}

// ============================================
// Main
// ============================================

buildBrowserEdition().catch((error) => {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
});
