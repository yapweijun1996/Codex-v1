const { createMcpToolDefinitions } = require('./utils/mcp-tool-loader');
const { loadSkillsSync, loadSkillsAsync, registerToolDefinitions } = require('./utils/skill-loader');
const { getSkillList, getSkillDetail, buildSystemPromptAddition } = require('./utils/skill-catalog');

class SkillManager {
    constructor(skillsDir, { catalogLimit = 80 } = {}) {
        this.skillsDir = skillsDir;
        this.skills = []; // Array of { name, description, instruction }
        this.tools = []; // Array of tool definitions from skills
        this.catalogLimit = catalogLimit;
        this._externalMcp = null; // { urls, quiet, timeoutMs, headers }
    }

    // Rescan skills directory and reload metadata/tools.
    refreshSkills(options = {}) {
        this.skills = [];
        this.tools = [];
        this.loadSkills(options);
    }

    // Async variant to support ESM tools.mjs loading.
    async refreshSkillsAsync(options = {}) {
        this.skills = [];
        this.tools = [];
        await this.loadSkillsAsync(options);

        // Re-attach external MCP tools (if configured).
        if (this._externalMcp && Array.isArray(this._externalMcp.servers) && this._externalMcp.servers.length > 0) {
            await this.loadExternalMcpToolsAsync(this._externalMcp);
        }
    }

    // Discover and register tools from external MCP servers (urls legacy, or servers config).
    async loadExternalMcpToolsAsync({ urls, servers, quiet = false, timeoutMs, headers } = {}) {
        const list = Array.isArray(urls) ? urls.filter(Boolean).map(String) : [];
        const srv = Array.isArray(servers) ? servers.filter(Boolean) : [];
        const normalized = (srv.length > 0)
            ? srv
            : list.map((u) => ({ url: u, namespace: false }));
        this._externalMcp = { servers: normalized, quiet, timeoutMs, headers };
        if (normalized.length === 0) return;

        const remoteToolDefs = await createMcpToolDefinitions(normalized, { quiet, timeoutMs, headers });
        registerToolDefinitions(remoteToolDefs, 'external_mcp', this.tools, { quiet });
    }

    loadSkills({ quiet = false } = {}) {
        loadSkillsSync({ skillsDir: this.skillsDir, skills: this.skills, tools: this.tools, quiet });
    }

    /**
     * Async tools loader using dynamic import() for ESM modules (e.g. tools.mjs).
     * This is optional and does NOT change the default sync behavior.
     */
    async loadSkillsAsync({ preferEsmTools = true, quiet = false } = {}) {
        await loadSkillsAsync({
            skillsDir: this.skillsDir,
            skills: this.skills,
            tools: this.tools,
            preferEsmTools,
            quiet
        });
    }

    /**
     * Returns a summary list of all available skills.
     */
    getSkillList() {
        return getSkillList(this.skills);
    }

    /**
     * Lazy-loads the full instruction/documentation for a specific skill by ID.
     */
    getSkillDetail(skillId) {
        return getSkillDetail(this.skills, skillId);
    }

    /**
     * Returns all native tools loaded from skills
     */
    getTools() {
        return this.tools;
    }

    getSystemPromptAddition() {
        return buildSystemPromptAddition(this.skills, this.catalogLimit);
    }
}

module.exports = { SkillManager };
