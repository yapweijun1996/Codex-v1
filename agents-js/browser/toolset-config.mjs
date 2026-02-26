export function getAgentsConfigFromGlobal(globalObj = globalThis) {
    const cfg = globalObj && globalObj.AGENTS_CONFIG;
    return (cfg && typeof cfg === 'object') ? cfg : null;
}

function normalizeStringList(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(Boolean).map((v) => String(v));
}

function shouldIncludeByEnabledDisabled(id, enabled, disabled) {
    if (!id) return false;
    if (disabled && disabled.size > 0 && disabled.has(id)) return false;
    if (enabled && enabled.size > 0) return enabled.has(id);
    return true;
}

export function isMcpEnabled(cfg) {
    const c = (cfg && typeof cfg === 'object') ? cfg : null;
    return !(c && c.mcp && c.mcp.enabled === false);
}

export function filterManifestByConfig(rawManifest, cfg) {
    const c = (cfg && typeof cfg === 'object') ? cfg : {};
    const skillsEnabled = new Set(normalizeStringList(c.skills && c.skills.enabled));
    const skillsDisabled = new Set(normalizeStringList(c.skills && c.skills.disabled));
    const toolsEnabled = new Set(normalizeStringList(c.tools && c.tools.enabled));
    const toolsDisabled = new Set(normalizeStringList(c.tools && c.tools.disabled));

    return (Array.isArray(rawManifest) ? rawManifest : [])
        .filter((skill) => {
            if (!skill || typeof skill !== 'object') return false;
            const id = skill.id ? String(skill.id) : '';
            return shouldIncludeByEnabledDisabled(id, skillsEnabled, skillsDisabled);
        })
        .map((skill) => {
            const id = skill.id ? String(skill.id) : '';
            const tools = Array.isArray(skill.tools) ? skill.tools : [];
            const filteredTools = tools.filter((t) => {
                const name = t && t.name ? String(t.name) : '';
                return shouldIncludeByEnabledDisabled(name, toolsEnabled, toolsDisabled);
            });

            const hasTools = filteredTools.length > 0;
            return {
                ...skill,
                id,
                tools: filteredTools,
                hasTools,
                toolsModule: hasTools ? (skill.toolsModule || null) : null,
            };
        });
}
