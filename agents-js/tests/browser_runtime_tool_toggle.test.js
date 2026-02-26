describe('Browser runtime tool toggles (AGENTS_CONFIG)', () => {
    it('filters manifest/tools and can disable MCP without network calls', async () => {
        const { createBrowserToolset } = await import('../browser/bootstrap.mjs');

        const calls = [];
        const manifestUrl = './skills-manifest.json';

        const manifest = [
            {
                id: 'open_meteo_sg',
                name: 'OPEN METEO SG',
                path: './skills/open_meteo_sg/SKILL.md',
                hasTools: true,
                toolsModule: './skills/open_meteo_sg/tools.mjs',
                tools: [
                    { name: 'open_meteo_current', description: 'x', parameters: { type: 'object', properties: {} } },
                ],
            },
            {
                id: 'searxng_search',
                name: 'SEARXNG SEARCH',
                path: './skills/searxng_search/SKILL.md',
                hasTools: true,
                toolsModule: './skills/searxng_search/tools.mjs',
                tools: [
                    { name: 'searxng_query', description: 'y', parameters: { type: 'object', properties: {} } },
                ],
            },
        ];

        const fetchImpl = async (url) => {
            calls.push(String(url));
            if (String(url) !== manifestUrl) {
                throw new Error(`Unexpected fetch url: ${url}`);
            }
            return {
                ok: true,
                async json() { return manifest; },
            };
        };

        const toolset = createBrowserToolset({
            manifestUrl,
            fetchImpl,
            getMcpConfig: () => ({
                mcpServers: {
                    demo: { transport: 'http', url: 'https://example.com/mcp' },
                },
            }),
            getAgentsConfig: () => ({
                mcp: { enabled: false },
                skills: { disabled: ['searxng_search'] },
            }),
        });

        const manifestOut = await toolset.fetchManifest();
        expect(manifestOut.map(s => s.id)).toEqual(['open_meteo_sg']);

        const ready = await toolset.ensureToolsReady({ includeMcp: true });
        const names = ready.tools.map(t => t.name);
        expect(names).toContain('open_meteo_current');
        expect(names).toContain('memory_search');
        expect(names).toContain('kb_search');
        expect(names).toContain('memory_save');
        expect(names).toContain('memory_read_graph');
        expect(names).toContain('memory__search_nodes');
        expect(names).toContain('memory__read_graph');
        expect(names).toContain('update_plan');

        // Only the manifest should be fetched; MCP must not be touched.
        expect(calls).toEqual([manifestUrl]);
    });

    it('can disable individual tools while keeping the skill visible', async () => {
        const { createBrowserToolset } = await import('../browser/bootstrap.mjs');

        const manifestUrl = './skills-manifest.json';
        const manifest = [
            {
                id: 'open_meteo_sg',
                name: 'OPEN METEO SG',
                path: './skills/open_meteo_sg/SKILL.md',
                hasTools: true,
                toolsModule: './skills/open_meteo_sg/tools.mjs',
                tools: [
                    { name: 'open_meteo_current', description: 'x', parameters: { type: 'object', properties: {} } },
                ],
            },
        ];

        const fetchImpl = async (url) => {
            if (String(url) !== manifestUrl) throw new Error(`Unexpected fetch url: ${url}`);
            return { ok: true, async json() { return manifest; } };
        };

        const toolset = createBrowserToolset({
            manifestUrl,
            fetchImpl,
            getAgentsConfig: () => ({
                tools: { disabled: ['open_meteo_current'] },
            }),
        });

        const manifestOut = await toolset.fetchManifest();
        expect(manifestOut).toHaveLength(1);
        expect(manifestOut[0].id).toBe('open_meteo_sg');
        expect(manifestOut[0].hasTools).toBe(false);

        const ready = await toolset.ensureToolsReady({ includeMcp: false });
        const names = ready.tools.map(t => t.name);
        expect(names).toContain('memory_search');
        expect(names).toContain('kb_search');
        expect(names).toContain('memory_save');
        expect(names).toContain('memory_read_graph');
        expect(names).toContain('memory__search_nodes');
        expect(names).toContain('memory__read_graph');
        expect(names).toContain('update_plan');
    });
});
