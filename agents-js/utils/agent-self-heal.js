function isBrowserRuntime() {
    return typeof window !== 'undefined';
}

function isBrowserEnvRestrictionLikeMessage(message) {
    const text = String(message || '').toLowerCase();
    if (!text) return false;
    return (
        text.includes('cors') ||
        text.includes('cross-origin') ||
        text.includes('access-control-allow-origin') ||
        text.includes('failed to fetch') ||
        text.includes('networkerror when attempting to fetch') ||
        text.includes('load failed') ||
        text.includes('mixed content') ||
        text.includes('blocked:mixed-content') ||
        text.includes('insecure request') ||
        text.includes('secure context') ||
        text.includes('same origin') ||
        text.includes('same-origin')
    );
}

function getNodeErrorCode(output) {
    if (!output || typeof output !== 'object') return null;
    const code = output.code || output.errno || output.error_code;
    return typeof code === 'string' && code.trim() ? code.trim() : null;
}

function classifyNodeError({ code, message }) {
    const normalized = typeof code === 'string' ? code.toUpperCase() : '';
    const msg = String(message || '').toLowerCase();
    const ioCodes = new Set(['ENOENT', 'EACCES', 'EPERM', 'ENOTDIR', 'EISDIR']);
    const netCodes = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'ECONNRESET']);
    if (ioCodes.has(normalized) || msg.includes('no such file') || msg.includes('permission denied')) {
        return 'node_io_error';
    }
    if (netCodes.has(normalized) || msg.includes('connect') || msg.includes('econn')) {
        return 'node_network_error';
    }
    return null;
}

function classifyToolFailure({ toolName, output, isRateLimitLike }) {
    if (output && typeof output === 'object') {
        if (output.error) {
            if (String(output.error).toLowerCase() === 'timeout') {
                return 'timeout';
            }

            if (
                output.status === 429 ||
                output.statusCode === 429 ||
                output.code === 429 ||
                (typeof isRateLimitLike === 'function' && (isRateLimitLike(output.error) || isRateLimitLike(output.message)))
            ) {
                return 'rate_limited';
            }

            if (isBrowserRuntime()) {
                const err = String(output.error || '');
                const meta = [output.message, output.reason, output.detail, output.hint]
                    .filter(Boolean)
                    .map((v) => String(v))
                    .join(' ');
                const combined = `${err} ${meta}`;
                if (
                    String(output.platform || '').toLowerCase() === 'browser' ||
                    err.toLowerCase() === 'environment restriction' ||
                    isBrowserEnvRestrictionLikeMessage(combined)
                ) {
                    return 'environment_restriction';
                }
            } else {
                const code = getNodeErrorCode(output);
                const message = output.message || output.error || '';
                const nodeType = classifyNodeError({ code, message });
                if (nodeType) return nodeType;
            }

            if (toolName === 'run_command' && String(output.error).toLowerCase().includes('access denied')) {
                return 'access_denied';
            }
            if (toolName === 'apply_patch') {
                const text = `${output.error || ''} ${output.message || ''}`.toLowerCase();
                if (text.includes('invalid patch') || text.includes('unsupported patch')) {
                    return 'patch_format_error';
                }
            }
            return 'tool_error';
        }

        if (toolName === 'run_command' && typeof output.exitCode === 'number' && output.exitCode !== 0) {
            return 'nonzero_exit';
        }
    }
    return null;
}

function recordToolFailure({ toolFailureStreak, toolName, fingerprintOrType, args, makeFailureFingerprint }) {
    if (!toolFailureStreak || !toolName) return;
    let fingerprint = fingerprintOrType;
    let failureType = undefined;
    if (args !== undefined && typeof fingerprintOrType === 'string') {
        failureType = fingerprintOrType;
        fingerprint = makeFailureFingerprint(toolName, fingerprintOrType, args);
    }

    const prev = toolFailureStreak.get(toolName);
    if (prev && prev.fingerprint === fingerprint) {
        toolFailureStreak.set(toolName, {
            count: prev.count + 1,
            fingerprint,
            failureType: failureType || prev.failureType,
        });
    } else {
        toolFailureStreak.set(toolName, { count: 1, fingerprint, failureType });
    }
}

function clearToolFailure({ toolFailureStreak, toolName }) {
    if (!toolFailureStreak || !toolName) return;
    toolFailureStreak.delete(toolName);
}

function withSelfHealHint({ toolFailureStreak, toolName, output, defaultLoopFingerprintThreshold }) {
    if (!toolFailureStreak || !toolName) return output;
    const state = toolFailureStreak.get(toolName);
    if (!state || state.count < 2) return output;

    const hardStop = state.count >= defaultLoopFingerprintThreshold;

    const adviceByType = {
        timeout: 'This tool timed out repeatedly. Reduce scope/complexity, verify network/connectivity, or use an alternative tool.',
        rate_limited: 'This tool is being rate limited. Wait before retrying, reduce call frequency, or consolidate requests.',
        format_error: 'This tool returned a non-JSON-serializable output. Adjust parameters to return structured JSON, or check read_skill_documentation.',
        environment_restriction: 'This tool appears blocked by the browser environment (CORS / same-origin policy, mixed content, or blocked network request). Do NOT retry the same call. Explain the limitation to the user and suggest running in Node.js, or using an explicitly configured proxy/alternative source.',
        node_io_error: 'This tool appears to have hit a Node.js filesystem error (missing file/dir or permissions). Verify the path, check permissions, and confirm the working directory before retrying.',
        node_network_error: 'This tool appears to have hit a Node.js network error. Verify host/port, connectivity, and whether the service is running before retrying.',
        patch_format_error: 'apply_patch format is invalid. Keep using apply_patch, fix to "*** Begin Patch ... *** Delete File: <path> ... *** End Patch", and retry once. Do not switch to list_available_skills for syntax-only failures.',
    };

    const baseAdvice = hardStop
        ? [
            'STOP: You have repeated the same failing tool call. You MUST change your approach.',
            adviceByType[state.failureType] || 'Verify inputs and environment, then change approach.',
            'Do not retry with the same parameters. Either adjust inputs materially, or switch tools. If unsure, use list_available_skills and read_skill_documentation.',
        ].join(' ')
        : [
            'This tool has failed repeatedly. Change strategy instead of retrying the same call.',
            adviceByType[state.failureType] || 'Verify inputs and environment first (e.g. for run_command: try "pwd" and "ls"; for file/path issues: confirm the path).',
            'If unsure, use list_available_skills and read_skill_documentation to find an appropriate alternative.',
        ].join(' ');

    if (output && typeof output === 'object' && !Array.isArray(output)) {
        return {
            ...output,
            _self_heal: {
                repeatedFailures: state.count,
                failureType: state.failureType || null,
                intervention: hardStop ? 'hard_stop' : 'soft_hint',
                advice: baseAdvice,
            },
        };
    }

    return {
        result: output,
        _self_heal: {
            repeatedFailures: state.count,
            failureType: state.failureType || null,
            intervention: hardStop ? 'hard_stop' : 'soft_hint',
            advice: baseAdvice,
        },
    };
}

module.exports = {
    isBrowserRuntime,
    isBrowserEnvRestrictionLikeMessage,
    classifyToolFailure,
    recordToolFailure,
    clearToolFailure,
    withSelfHealHint,
};
