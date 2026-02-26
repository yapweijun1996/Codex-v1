
/**
 * Executes a function with exponential backoff retry logic.
 * 
 * @param {Function} fn - The async function to execute.
 * @param {Object} options - Retry options.
 * @param {number} [options.maxRetries=5] - Maximum number of retries.
 * @param {number} [options.baseDelay=1000] - Base delay in ms.
 * @param {number} [options.maxWaitSeconds=60] - Max seconds to wait before a retry.
 * @param {number} [options.bufferSeconds=5] - Extra seconds added to server-provided retryDelay.
 * @param {number} [options.jitterMsMax=500] - Max jitter in ms.
 * @param {(info: { attempt: number, maxRetries: number, waitMs: number, error: any }) => void} [options.onRetry] - Optional callback for retry events.
 * @returns {Promise<any>} - The result of the function.
 */
function isRetryableGeminiError(e) {
    if (!e) return false;
    const status = e.status || e.code || (e.response && e.response.status);
    const msg = String(e.message || e);
    const lower = msg.toLowerCase();

    return (
        (typeof status === 'number' && status >= 500) ||
        status === 429 ||
        status === 503 ||
        msg.includes('429') ||
        msg.includes('503') ||
        lower.includes('fetch failed') ||
        lower.includes('econnreset') ||
        lower.includes('etimedout') ||
        lower.includes('enotfound') ||
        lower.includes('network') ||
        lower.includes('rate limit') ||
        lower.includes('quota') ||
        lower.includes('exceeded your current quota')
    );
}

function extractRetryDelaySeconds(e) {
    const seen = new Set();
    const candidates = [];

    function visit(v) {
        if (!v) return;
        if (typeof v === 'string') {
            candidates.push(v);
            return;
        }
        if (typeof v !== 'object') return;
        if (seen.has(v)) return;
        seen.add(v);

        if (Array.isArray(v)) {
            v.forEach(visit);
            return;
        }

        for (const k of Object.keys(v)) {
            try {
                visit(v[k]);
            } catch {
                // Ignore getters throwing
            }
        }
    }

    visit(e);
    if (e && e.message) candidates.unshift(String(e.message));

    const patterns = [
        /retryDelay\"\s*:\s*\"(\d+(?:\.\d+)?)s\"/i,
        /retryDelay\s*[:=]\s*\"?(\d+(?:\.\d+)?)s\"?/i,
        /please retry in\s+(\d+(?:\.\d+)?)s/i,
        /retry in\s+(\d+(?:\.\d+)?)s/i,
    ];

    for (const text of candidates) {
        for (const re of patterns) {
            const m = text.match(re);
            if (m && m[1]) {
                const n = Number(m[1]);
                if (Number.isFinite(n) && n > 0) return n;
            }
        }
    }

    return null;
}

async function executeWithRetry(fn, options = {}) {
    const maxRetries = options.maxRetries || 5;
    const baseDelay = options.baseDelay || 1000;
    const maxWaitSeconds = options.maxWaitSeconds || 60;
    const bufferSeconds = (typeof options.bufferSeconds === 'number') ? options.bufferSeconds : 5;
    const jitterMsMax = (typeof options.jitterMsMax === 'number') ? options.jitterMsMax : 500;
    let retries = 0;

    while (true) {
        try {
            return await fn();
        } catch (e) {
            if (isRetryableGeminiError(e) && retries < maxRetries) {
                retries++;

                const status = e && (e.status || e.code || (e.response && e.response.status));
                const retryDelaySec = extractRetryDelaySeconds(e);

                let delayMs;
                if (retryDelaySec) {
                    const sec = Math.ceil(retryDelaySec + bufferSeconds);
                    if (sec > maxWaitSeconds) {
                        throw new Error(
                            `Rate limited (status ${status || 'Unknown'}). ` +
                            `Retry suggested in ~${sec}s which exceeds auto-wait limit (${maxWaitSeconds}s).`
                        );
                    }
                    delayMs = sec * 1000;
                } else {
                    // Exponential backoff with jitter (capped)
                    const exponentialBackoff = Math.pow(2, retries) * baseDelay;
                    const jitter = Math.random() * jitterMsMax;
                    delayMs = Math.min(exponentialBackoff + jitter, maxWaitSeconds * 1000);
                }

                console.warn(
                    `[RetryHelper] Retryable error (Status: ${status || 'Unknown'}). ` +
                    `Retrying in ${Math.floor(delayMs)}ms... (Attempt ${retries}/${maxRetries})`
                );

                if (typeof options.onRetry === 'function') {
                    try {
                        options.onRetry({ attempt: retries, maxRetries, waitMs: delayMs, error: e });
                    } catch {
                        // ignore callback failures
                    }
                }

                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue;
            }

            // Repropagate error if not retryable or retries exhausted
            throw e;
        }
    }
}

module.exports = { executeWithRetry };
