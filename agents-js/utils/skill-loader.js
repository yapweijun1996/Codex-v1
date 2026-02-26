const { getNodeDeps } = require('./skill-runtime');
const { RiskLevel, normalizeRiskLevel } = require('./imda-constants');

function warnNonNode() {
    console.warn('[SkillManager] Non-Node runtime detected. Skipping disk scan; use list_available_skills/read_skill_documentation.');
}

function warnMissingDir(skillsDir) {
    console.warn(`[SkillManager] Skills directory not found: ${skillsDir}`);
}

function loadSkillMetadata({ filePath, directoryName, skills }) {
    try {
        const deps = getNodeDeps();
        if (!deps) return;
        const { fs, yaml } = deps;

        const content = fs.readFileSync(filePath, 'utf8');
        const parts = content.split(/^---$/m);
        if (parts.length < 3) return;

        const frontmatterRaw = parts[1];
        const metadata = yaml.load(frontmatterRaw);

        skills.push({
            id: directoryName,
            name: metadata.name || directoryName,
            description: metadata.description || '',
            filePath: filePath
        });
    } catch (e) {
        console.error(`[SkillManager] Error loading metadata for ${directoryName}:`, e);
    }
}

function registerToolDefinitions(toolDefinitions, skillName, tools, { quiet = false } = {}) {
    if (!Array.isArray(toolDefinitions)) return;
    for (const tool of toolDefinitions) {
        if (!tool || !tool.name || !tool.func) {
            console.warn(`[SkillManager] Invalid tool definition in skill "${skillName}": missing name or func`);
            continue;
        }

        if (!tool._skillSource) tool._skillSource = skillName;
        tool.risk = normalizeRiskLevel(tool.risk, RiskLevel.MEDIUM);
        tools.push(tool);
        if (!quiet) console.log(`  ✓ Registered tool: ${tool.name} (from skill: ${tool._skillSource})`);
    }
}

function loadToolsFile(filePath, skillName, tools, { quiet = false } = {}) {
    try {
        const toolDefinitions = require(filePath);

        if (!Array.isArray(toolDefinitions)) {
            console.warn(`[SkillManager] tools.js in skill "${skillName}" must export an array of tool definitions.`);
            return;
        }

        registerToolDefinitions(toolDefinitions, skillName, tools, { quiet });
    } catch (e) {
        console.error(`[SkillManager] Error loading tools from ${filePath}:`, e);
    }
}

async function loadToolsFileAsync(filePath, skillName, tools, { quiet = false } = {}) {
    try {
        const deps = getNodeDeps();
        if (!deps) return;
        const { url } = deps;

        let loaded;
        if (filePath.endsWith('.mjs')) {
            const fileUrl = url.pathToFileURL(filePath).href;
            loaded = await import(fileUrl);
        } else {
            loaded = require(filePath);
        }

        const toolDefinitions = Array.isArray(loaded)
            ? loaded
            : (loaded && (loaded.default || loaded.tools));

        if (!Array.isArray(toolDefinitions)) {
            console.warn(`[SkillManager] tools in skill "${skillName}" must export an array (default export for ESM).`);
            return;
        }

        registerToolDefinitions(toolDefinitions, skillName, tools, { quiet });
    } catch (e) {
        console.error(`[SkillManager] Error loading tools from ${filePath}:`, e);
    }
}

function loadSkillsSync({ skillsDir, skills, tools, quiet = false } = {}) {
    const deps = getNodeDeps();
    if (!deps) {
        warnNonNode();
        return;
    }

    const { fs, path } = deps;
    if (!fs.existsSync(skillsDir)) {
        warnMissingDir(skillsDir);
        return;
    }

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillDir = path.join(skillsDir, entry.name);
        const skillMdPath = path.join(skillDir, 'SKILL.md');

        if (fs.existsSync(skillMdPath)) {
            loadSkillMetadata({ filePath: skillMdPath, directoryName: entry.name, skills });
        }

        const toolsJsPath = path.join(skillDir, 'tools.js');
        if (fs.existsSync(toolsJsPath)) {
            loadToolsFile(toolsJsPath, entry.name, tools, { quiet });
        }
    }
}

async function loadSkillsAsync({ skillsDir, skills, tools, preferEsmTools = true, quiet = false } = {}) {
    const deps = getNodeDeps();
    if (!deps) {
        warnNonNode();
        return;
    }

    const { fs, path } = deps;
    if (!fs.existsSync(skillsDir)) {
        warnMissingDir(skillsDir);
        return;
    }

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillDir = path.join(skillsDir, entry.name);
        const skillMdPath = path.join(skillDir, 'SKILL.md');

        if (fs.existsSync(skillMdPath)) {
            loadSkillMetadata({ filePath: skillMdPath, directoryName: entry.name, skills });
        }

        const toolsEsmPath = path.join(skillDir, 'tools.mjs');
        const toolsJsPath = path.join(skillDir, 'tools.js');

        const selectedToolsPath =
            (preferEsmTools && fs.existsSync(toolsEsmPath))
                ? toolsEsmPath
                : (fs.existsSync(toolsJsPath) ? toolsJsPath : null);

        if (selectedToolsPath) {
            await loadToolsFileAsync(selectedToolsPath, entry.name, tools, { quiet });
        }
    }
}

module.exports = {
    loadSkillsSync,
    loadSkillsAsync,
    registerToolDefinitions
};
