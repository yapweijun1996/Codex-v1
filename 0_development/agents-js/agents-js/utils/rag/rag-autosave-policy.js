function compactText(input, maxLen = 240) {
    const text = String(input || '').trim().replace(/\s+/g, ' ');
    if (text.length <= maxLen) return text;
    return `${text.slice(0, Math.max(0, maxLen - 3))}...`;
}

function buildAutoSavePayload({ userInput }) {
    const text = String(userInput || '').trim();
    if (!text) return null;

    const patterns = [
        {
            type: 'fact',
            title: 'User name',
            regex: /\bmy\s+name\s+is\s+([^\n.,!?]{2,80})/i,
            map: (m) => `User says their name is ${m[1].trim()}.`,
        },
        {
            type: 'preference',
            title: 'User preference',
            regex: /\bmy\s+favorite\s+([^\n.,!?]{2,60})\s+is\s+([^\n.,!?]{2,120})/i,
            map: (m) => `Favorite ${m[1].trim()}: ${m[2].trim()}.`,
        },
        {
            type: 'preference',
            title: 'User preference',
            regex: /\bi\s+(?:like|love|prefer)\s+([^\n.,!?]{3,120})/i,
            map: (m) => `User preference: ${m[1].trim()}.`,
        },
        {
            type: 'note',
            title: 'Remembered note',
            regex: /\bremember\s+that\s+([^\n]{4,200})/i,
            map: (m) => m[1].trim(),
        },
    ];

    for (const p of patterns) {
        const match = text.match(p.regex);
        if (!match) continue;

        const content = compactText(p.map(match), 220);
        if (!content) return null;

        return {
            type: p.type,
            title: p.title,
            content,
            metadata: {
                tags: ['auto_saved'],
                source: 'agentic_rag_policy',
            },
        };
    }

    return null;
}

function shouldAutoSave(agent) {
    return Boolean(agent && agent.ragConfig && agent.ragConfig.enabled && agent.ragConfig.autoSave);
}

module.exports = {
    buildAutoSavePayload,
    shouldAutoSave,
};
