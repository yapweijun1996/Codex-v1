/**
 * Web Server for agents-js
 * Provides HTTP API for interacting with the Agent system.
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { createAgentAsync } = require('./agent-factory');
const { handleChatRequest, handleChatStreamRequest } = require('./utils/server-handlers');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let skillManagerInstance = null;
let toolsList = [];

async function initAgent() {
    console.log('[Server] Initializing base system...');
    try {
        const { skillManager, tools } = await createAgentAsync();
        skillManagerInstance = skillManager;
        toolsList = tools;
        console.log('[Server] System ready');
    } catch (error) {
        console.error('[Server] Failed to initialize:', error);
        process.exit(1);
    }
}

// --- API Routes ---

app.get('/api/info', (req, res) => {
    try {
        const skills = skillManagerInstance.skills.map(s => ({ name: s.name, description: s.description }));
        const tools = toolsList.map(t => ({
            name: t.name,
            description: t.description,
            skillSource: t._skillSource || 'built-in'
        }));
        res.json({ success: true, data: { skills, tools, totalSkills: skills.length, totalTools: tools.length } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/chat', handleChatRequest);
app.post('/api/chat/stream', handleChatStreamRequest);

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

async function startServer() {
    await initAgent();
    app.listen(PORT, () => {
        console.log(`\n╔════════════════════════════════════════════╗`);
        console.log(`║  🤖 agents-js Web Server                  ║`);
        console.log(`╠════════════════════════════════════════════╣`);
        console.log(`║  Server running at:                        ║`);
        console.log(`║  → http://localhost:${PORT}                   ║`);
        console.log(`╚════════════════════════════════════════════╝\n`);
    });
}

startServer();

process.on('SIGINT', () => {
    console.log('\n[Server] Shutting down...');
    process.exit(0);
});
