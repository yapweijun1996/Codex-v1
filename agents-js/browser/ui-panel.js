import { elements, escapeHtml } from './ui-dom.js';

export async function openSkillDetail(skill) {
    elements.panelTitle.textContent = skill.name;
    elements.panelContent.textContent = 'Loading...';
    elements.panel.classList.add('open');
    elements.panel.setAttribute('aria-hidden', 'false');

    try {
        const response = await fetch(skill.path);
        if (!response.ok) throw new Error('Document not found');
        let md = await response.text();
        md = md.replace(/^---[\s\S]*?---/, '').trim();
        elements.panelContent.innerHTML = marked.parse(md);
    } catch (error) {
        elements.panelContent.textContent = `Could not load ${skill.path}.`;
    }
}

export async function openMcpToolDetail(tool) {
    elements.panelTitle.textContent = tool.name;
    elements.panel.classList.add('open');
    elements.panel.setAttribute('aria-hidden', 'false');

    const schema = tool.parameters || { type: 'object', properties: {} };
    const desc = tool.description || '';
    elements.panelContent.innerHTML = `
        <div><strong>MCP Tool</strong></div>
        <div style="margin-top:8px;">${escapeHtml(desc)}</div>
        <pre style="margin-top:12px; white-space:pre-wrap;">${escapeHtml(JSON.stringify(schema, null, 2))}</pre>
    `;
}

export function closePanel() {
    elements.panel.classList.remove('open');
    elements.panel.setAttribute('aria-hidden', 'true');
}
