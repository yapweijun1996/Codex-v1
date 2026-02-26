export async function loadSkillsUI({
    toolset,
    elements,
    escapeHtml,
    openSkillDetail,
    openMcpToolDetail,
    getExternalMcpConfigFromGlobal,
} = {}) {
    try {
        const skills = await toolset.fetchManifest();
        elements.skillCount.textContent = String(skills.length);
        elements.skillList.innerHTML = '';

        skills.forEach((skill) => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `<strong>${escapeHtml(skill.name)}</strong>
                <span>${skill.hasTools ? 'Native Tool' : 'System Prompt'}</span>`;
            item.onclick = () => openSkillDetail(skill);
            elements.skillList.appendChild(item);
        });

        const cfg = getExternalMcpConfigFromGlobal();
        if (!cfg) {
            elements.mcpToolCount.textContent = '0';
            elements.mcpToolList.innerHTML = '<div class="list-empty">No MCP config.</div>';
            return;
        }

        elements.mcpToolList.innerHTML = '<div class="list-empty">Loading MCP tools...</div>';
        try {
            const mcpTools = await toolset.loadMcpTools();
            elements.mcpToolCount.textContent = String(mcpTools.length);
            elements.mcpToolList.innerHTML = '';
            if (mcpTools.length === 0) {
                elements.mcpToolList.innerHTML = '<div class="list-empty">No HTTP MCP tools available.</div>';
                return;
            }

            mcpTools.forEach((tool) => {
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `<strong>${escapeHtml(tool.name)}</strong><span>MCP Tool</span>`;
                item.onclick = () => openMcpToolDetail(tool);
                elements.mcpToolList.appendChild(item);
            });
        } catch {
            elements.mcpToolCount.textContent = '0';
            elements.mcpToolList.innerHTML = '<div class="list-empty">MCP load failed (likely CORS).</div>';
        }
    } catch {
        elements.skillList.innerHTML = '<div class="list-empty">Failed to load manifest. Run build:browser.</div>';
    }
}

