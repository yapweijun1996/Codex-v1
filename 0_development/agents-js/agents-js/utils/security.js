const {
    splitCommandSegments,
    scanUnsafeOperators,
    splitArgv,
    isShellWrapper,
} = require('./command-parser');
const { isDangerousTokens } = require('./command-danger-zone');

function isNodeRuntime() {
    return (
        typeof window === 'undefined' &&
        typeof process !== 'undefined' &&
        !!(process.versions && process.versions.node)
    );
}

function checkCommandString(command, depth = 0) {
    if (depth > 5) {
        return { safe: false, reason: 'command nesting too deep' };
    }

    const opScan = scanUnsafeOperators(command);
    if (!opScan.safe) return opScan;

    const segments = splitCommandSegments(command);
    for (const seg of segments) {
        const argv = splitArgv(seg);
        const wrap = isShellWrapper(argv);
        if (wrap && wrap.payload) {
            const inner = checkCommandString(wrap.payload, depth + 1);
            if (!inner.safe) return inner;
        }

        const tokenRes = isDangerousTokens(argv);
        if (tokenRes.dangerous) {
            return { safe: false, reason: tokenRes.reason || 'Restricted command' };
        }
    }
    return { safe: true };
}

class SecurityValidator {
    static validateTool(toolName, args, context = {}) {
        const runtime = context.runtime || (isNodeRuntime() ? 'node' : 'browser');

        if (toolName === 'run_command') {
            if (runtime !== 'node') {
                return {
                    safe: false,
                    reason: 'run_command is not supported in browser runtime',
                    platform: runtime,
                };
            }

            const command = args && typeof args.command === 'string' ? args.command : '';
            const res = checkCommandString(command);
            return {
                safe: res.safe,
                reason: res.safe ? undefined : res.reason,
                platform: runtime,
            };
        }

        if (toolName === 'apply_patch') {
            if (runtime !== 'node') {
                return {
                    safe: false,
                    reason: 'apply_patch is not supported in browser runtime',
                    platform: runtime,
                };
            }
            return { safe: true, platform: runtime };
        }

        return { safe: true, platform: runtime };
    }
}

module.exports = { SecurityValidator };
