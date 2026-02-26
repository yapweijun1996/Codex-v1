const { executeWithRetry } = require('../utils/retry');

describe('retry advanced behavior', () => {
    it('throws when retryDelay exceeds max wait', async () => {
        const fn = async () => {
            const err = new Error('retryDelay: "120s"');
            err.status = 429;
            throw err;
        };

        await expect(executeWithRetry(fn, { maxRetries: 2, maxWaitSeconds: 1 })).rejects.toThrow(
            /exceeds auto-wait limit/i
        );
    });

    it('retries with backoff and ignores onRetry errors', async () => {
        let attempts = 0;
        const fn = async () => {
            attempts += 1;
            if (attempts < 3) {
                const err = new Error('rate limit');
                err.status = 429;
                throw err;
            }
            return 'ok';
        };

        const res = await executeWithRetry(fn, {
            maxRetries: 3,
            baseDelay: 1,
            maxWaitSeconds: 1,
            jitterMsMax: 0,
            onRetry: () => { throw new Error('fail'); },
        });

        expect(res).toBe('ok');
        expect(attempts).toBe(3);
    });
});
