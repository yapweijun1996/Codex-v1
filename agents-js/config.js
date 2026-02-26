const CONFIG = {
    agent: {
        maxTurns: 50,
        maxProtectedRecentMessages: 12,
        // Optional: Tool output guard limits.
        // This prevents huge tool results (stdout/html/json) from bloating history/trace/UI.
        // toolOutputLimits: {
        //     maxStringChars: 12000,
        //     headChars: 8000,
        //     tailChars: 2000,
        //     maxArrayItems: 60,
        //     maxObjectKeys: 60,
        //     maxDepth: 5,
        // },
        compaction: {
            enabled: true,
            triggerMessages: 30,
            triggerTokens: null,
            keepRecentMessages: 8,
            maxSummaryChars: 20000,
            maxMessageChars: 2000,
            maxUserMessageTokens: 20000,
        },
    },
};

if (typeof globalThis !== 'undefined') {
    if (!globalThis.AGENTS_DEFAULT_CONFIG) {
        globalThis.AGENTS_DEFAULT_CONFIG = CONFIG;
    }
}

module.exports = CONFIG;
