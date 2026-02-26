function now() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }
    return Date.now();
}

function getActiveToolsSnapshot(agent) {
    const timestamp = now();
    return Array.from(agent._activeTools.values()).map((entry) => ({
        id: entry.id,
        name: entry.name,
        elapsedMs: Math.max(0, Math.round(timestamp - entry.startTime)),
    }));
}

module.exports = { now, getActiveToolsSnapshot };
