const fs = require('fs');
const os = require('os');
const path = require('path');

const { readNodeMcpHttpServersFromFile } = require('../utils/mcp-config-adapter');

describe('mcp-config-adapter (node file)', () => {
    it('reads mcp-config.json with multiline JSON', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-js-mcp-'));
        const file = path.join(dir, 'mcp-config.json');

        fs.writeFileSync(file, JSON.stringify({
            mcpServers: {
                context7: {
                    transport: 'http',
                    url: 'https://mcp.context7.com/mcp',
                    headers: { CONTEXT7_API_KEY: 'k123' },
                },
            },
        }, null, 2));

        const servers = readNodeMcpHttpServersFromFile(file);
        expect(servers).toEqual([
            {
                serverName: 'context7',
                url: 'https://mcp.context7.com/mcp',
                headers: { CONTEXT7_API_KEY: 'k123' },
                namespace: true,
            },
        ]);

        fs.rmSync(dir, { recursive: true, force: true });
    });
});
