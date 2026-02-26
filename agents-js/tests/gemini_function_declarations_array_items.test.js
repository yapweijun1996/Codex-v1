const fs = require('fs');
const path = require('path');

function makeJsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    async json() {
      return payload;
    },
  };
}

function buildFetchManifestOnly(repoRoot) {
  const manifestPath = path.join(repoRoot, 'browser', 'skills-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return async function fetchImpl(input) {
    const href = String(input || '');
    if (href.includes('skills-manifest.json')) return makeJsonResponse(manifest);
    return { ok: false, status: 404, async json() { return {}; } };
  };
}

function mergeTools(browserTools = [], hostTools = []) {
  const merged = [];
  const seen = new Set();
  for (const tool of hostTools) {
    if (!tool || !tool.name || seen.has(tool.name)) continue;
    seen.add(tool.name);
    merged.push(tool);
  }
  for (const tool of browserTools) {
    if (!tool || !tool.name || seen.has(tool.name)) continue;
    seen.add(tool.name);
    merged.push(tool);
  }
  return merged;
}

function assertArrayItemsPresent(node, pathLabel) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      assertArrayItemsPresent(node[i], `${pathLabel}[${i}]`);
    }
    return;
  }

  if (node.type === 'array') {
    expect(Object.prototype.hasOwnProperty.call(node, 'items')).toBe(true);
    expect(node.items).not.toBeNull();
    expect(node.items).not.toBeUndefined();
  }

  for (const [key, value] of Object.entries(node)) {
    assertArrayItemsPresent(value, `${pathLabel}.${key}`);
  }
}

describe('Gemini functionDeclarations schema guard', () => {
  it('ensures every array type has items for AFW-exported tools', async () => {
    const repoRoot = path.resolve(__dirname, '..');
    const fetchImpl = buildFetchManifestOnly(repoRoot);

    const { createBrowserToolset, formatToolsForGemini } = await import('../browser/bootstrap.mjs');
    const { createAfwHostTools } = await import('../browser/ui-afw-agent-tools.js');

    const toolset = createBrowserToolset({
      manifestUrl: './skills-manifest.json',
      fetchImpl,
      getAgentsConfig: () => ({ mcp: { enabled: false } }),
      getMcpConfig: () => null,
    });
    const ready = await toolset.ensureToolsReady({ includeMcp: false });
    const browserTools = ready && Array.isArray(ready.tools) ? ready.tools : [];
    const hostTools = createAfwHostTools();
    const mergedTools = mergeTools(browserTools, hostTools);

    const formatted = formatToolsForGemini(mergedTools);
    const declarations = formatted[0] && Array.isArray(formatted[0].functionDeclarations)
      ? formatted[0].functionDeclarations
      : [];

    expect(declarations.length).toBeGreaterThan(0);
    for (let i = 0; i < declarations.length; i += 1) {
      const decl = declarations[i];
      assertArrayItemsPresent(decl.parameters, `functionDeclarations[${i}].parameters`);
    }
  });
});
