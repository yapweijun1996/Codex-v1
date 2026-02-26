const { getNodeDeps } = require('./skill-runtime');

function getSkillList(skills) {
    return skills.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description
    }));
}

function getSkillDetail(skills, skillId) {
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return null;

    try {
        const deps = getNodeDeps();
        if (!deps) return null;
        const { fs, path } = deps;

        const content = fs.readFileSync(skill.filePath, 'utf8');
        const parts = content.split(/^---$/m);
        let markdownContent = parts.slice(2).join('---').trim();

        const skillBaseDir = path.dirname(skill.filePath);
        const safeBaseDir = skillBaseDir.split(path.sep).join('/');
        markdownContent = markdownContent.replace(/\{baseDir\}/g, safeBaseDir);

        return {
            ...skill,
            instruction: markdownContent
        };
    } catch (e) {
        console.error(`[SkillManager] Error lazy loading skill ${skillId}:`, e);
        return null;
    }
}

function buildSystemPromptAddition(skills, catalogLimit) {
    if (skills.length === 0) return '';

    const cap = catalogLimit;
    const list = getSkillList(skills)
        .slice()
        .sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    const shown = list.slice(0, cap);
    const moreCount = Math.max(0, list.length - shown.length);

    let output = `\n\n## Skill Catalog (Top ${shown.length})\n` +
        'Only skill names and descriptions are listed to avoid context overflow.\n' +
        'If you need details, call read_skill_documentation for that specific skill.\n' +
        'If the needed skill is not listed here, you MUST call list_available_skills to discover the full list.\n\n';

    for (const s of shown) {
        const desc = (s.description || '').trim();
        output += `- ${s.id}: ${desc || '(no description)'}\n`;
    }

    if (moreCount > 0) {
        output += `\n(${moreCount} more skills not shown. Use list_available_skills to discover them.)\n`;
    }

    return output;
}

module.exports = { getSkillList, getSkillDetail, buildSystemPromptAddition };
