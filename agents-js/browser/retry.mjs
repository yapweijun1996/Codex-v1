function extractStatus(error) {
    if (!error) return null;
    const direct = Number(error.status || error.code || (error.response && error.response.status));
    if (Number.isFinite(direct) && direct > 0) return direct;
    const msg = String(error.message || error);
    const match = msg.match(/\b(4\d{2}|5\d{2})\b/);
    return match ? Number(match[1]) : null;
}

function isRetryable(error) {
    const status = extractStatus(error);
    if (status === 429) return true;
    if (typeof status === 'number' && status >= 500) return true;
    const lower = String(error && error.message || error || '').toLowerCase();
    return (
        lower.includes('network') ||
        lower.includes('fetch failed') ||
        lower.includes('econnreset') ||
        lower.includes('etimedout') ||
        lower.includes('enotfound')
    );
}

export async function executeWithRetry(fn, {
    maxRetries = 2,
    baseDelay = 250,
    maxWaitSeconds = 5,
} = {}) {
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        } catch (error) {
            if (!isRetryable(error)) throw error;
            if (attempt >= maxRetries) throw error;
            const waitMs = Math.min(baseDelay * Math.pow(2, attempt), maxWaitSeconds * 1000);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            attempt += 1;
        }
    }
}
