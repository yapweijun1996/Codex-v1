const { createAgentAsync } = require('../agent-factory');

/**
 * Common response extractor to pull metadata from agent history.
 */
function extractTurnMetadata(agent, startTime) {
    const duration = Date.now() - startTime;
    const toolsUsed = [];
    for (const turn of agent.history) {
        if (turn.tool_calls && turn.tool_calls.length > 0) {
            toolsUsed.push(...turn.tool_calls.map(tc => tc.name));
        }
    }
    return {
        duration: `${duration}ms`,
        toolsUsed: [...new Set(toolsUsed)],
        turnCount: agent.history.filter(h => h.role === 'user').length
    };
}

/**
 * Handler for POST /api/chat
 */
async function handleChatRequest(req, res) {
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ success: false, error: 'Message is required and must be a string' });
        }

        const { agent } = await createAgentAsync();
        const startTime = Date.now();
        const response = await agent.run(message);

        res.json({
            success: true,
            response: response,
            metadata: extractTurnMetadata(agent, startTime)
        });
    } catch (error) {
        console.error('[API] Error processing chat:', error);
        res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
}

/**
 * Handler for POST /api/chat/stream
 */
async function handleChatStreamRequest(req, res) {
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ success: false, error: 'Message is required and must be a string' });
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        const sendEvent = (event, data) => {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        const { agent } = await createAgentAsync();

        // Forward agent events to SSE
        const eventTypes = ['start', 'thinking', 'tool_call', 'tool_result', 'tool_error', 'response'];
        eventTypes.forEach(type => {
            agent.on(type, (data) => sendEvent(type, data));
        });

        agent.on('done', (data) => {
            sendEvent('done', data);
            res.end();
        });

        try {
            await agent.run(message);
        } catch (error) {
            console.error('[API Stream] Error:', error);
            sendEvent('error', { error: error.message });
            res.end();
        }
    } catch (error) {
        console.error('[API Stream] Setup error:', error);
        res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
}

module.exports = {
    handleChatRequest,
    handleChatStreamRequest,
};
