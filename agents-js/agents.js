const { EventEmitter } = require('events');
const { runAsyncIterator: runAgentAsyncIterator } = require('./utils/agent-async-iterator');
const { executeTools } = require('./utils/agent-tool-runner');
const { dumpSnapshot, loadSnapshot, setState, getState } = require('./utils/agent-state');
const { initializeAgentState } = require('./utils/agent-setup');
const { startAgentTurn, finalizeAgentTurn } = require('./utils/agent-lifecycle');
const {
    awaitUserInput,
    respondToUserInput,
    submitPendingInput,
    drainPendingInputs,
} = require('./utils/agent-interaction');
const {
    applyUsageToEntry,
    buildTokenUsageInfo,
} = require('./utils/agent-usage');
const { sanitizeFinalResponse } = require('./utils/agent-completion');
const { runLlmStep } = require('./utils/agent-llm');
const { handleToolCalls, maybeAutoMemoryLookup, maybeAutoMemorySave } = require('./utils/agent-tool-flow');
const { applyTurnGuards } = require('./utils/agent-guards');
const { maybeCompactAgentHistory } = require('./utils/history-compactor');
const { createTraceCollector } = require('./utils/agent-trace');
const { evaluateBudgetGovernor, bumpPromptTokenLedger } = require('./utils/budget-governor');
const { normalizeRunPolicy, snapshotRuntimePolicy, applyRuntimePolicy, restoreRuntimePolicy } = require('./utils/run-policy');

class Agent extends EventEmitter {
    constructor({
        llm,
        tools = [],
        systemPrompt = "You are a helpful AI assistant.",
        toolTimeoutMs,
        approvalTimeoutMs,
        approvalPolicy,
        trustedTools,
        toolOutputLimits,
        snapshot,
        maxTurns,
        compaction,
        maxProtectedRecentMessages,
        identity,
        riskProfile,
        ragConfig,
        ragService,
        skillsDir,
    } = {}) {
        super();
        initializeAgentState(this, {
            llm,
            tools,
            systemPrompt,
            toolTimeoutMs,
            approvalTimeoutMs,
            approvalPolicy,
            trustedTools,
            toolOutputLimits,
            maxTurns,
            compaction,
            maxProtectedRecentMessages,
            identity,
            riskProfile,
            ragConfig,
            ragService,
            skillsDir,
        });

        if (snapshot) {
            this.loadSnapshot(snapshot, { emitPlanEvent: false });
        }

        this._traceCollector = createTraceCollector(this);
    }

    dumpSnapshot() {
        return dumpSnapshot(this);
    }

    loadSnapshot(snapshot, { emitPlanEvent = true } = {}) {
        return loadSnapshot(this, snapshot, { emitPlanEvent });
    }

    _setState(status, metadata = {}) {
        return setState(this, status, metadata);
    }

    getState() {
        return getState(this);
    }

    getIdentity() {
        return this.identity;
    }

    getRiskProfile() {
        return this.riskProfile;
    }

    getRunPolicy() {
        return this.runPolicy;
    }

    _awaitUserInput(callId, timeoutMs) {
        return awaitUserInput(this, callId, timeoutMs);
    }

    respondToUserInput(callId, response) {
        return respondToUserInput(this, callId, response);
    }

    submitInput(text) {
        return submitPendingInput(this, text);
    }

    async run(userInput, options = {}) {
        const requestedPolicy = options && typeof options === 'object' ? options.policy : null;
        const runtimeSnapshot = snapshotRuntimePolicy(this);
        if (requestedPolicy) {
            const normalizedPolicy = normalizeRunPolicy(requestedPolicy, {
                tier: this.riskProfile && this.riskProfile.tier,
                approvalMode: this.approvalPolicy,
                maxTurns: this.maxTurns,
                budget: this.runPolicy && this.runPolicy.budget,
                trustedTools: this.trustedTools,
                identity: this.identity,
                traceLevel: this.runPolicy && this.runPolicy.traceLevel,
            });
            applyRuntimePolicy(this, normalizedPolicy);
            this.emit('run_policy_applied', {
                tier: normalizedPolicy.tier,
                tenantId: normalizedPolicy.tenantId,
                approvalMode: normalizedPolicy.approvalMode,
                budget: normalizedPolicy.budget,
                traceLevel: normalizedPolicy.traceLevel,
            });
        }

        const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        if (this._abortController && this._abortController !== controller && !this._abortController.signal?.aborted) {
            this._abortController.abort();
        }
        this._abortController = controller;
        this._abortReason = null;
        const signal = controller ? controller.signal : null;

        const { dbg, turnStartIndex } = startAgentTurn(this, userInput);

        const compactResult = await this._maybeCompactHistory({ signal });
        if (compactResult && this.debug) dbg('Compaction result', { compacted: Boolean(compactResult.compacted), originalLength: compactResult.originalLength, newLength: Array.isArray(this.history) ? this.history.length : 0 });
        this._turnBudgetLedger = { promptTokens: 0 };
        let finalResponseText = "";
        let turnCount = 0;
        const MAX_TURNS = this.maxTurns;
        let realtimeGuardCount = 0;
        let planGuardCount = 0;
        let memoryPrecheckDone = false;
        let memoryAutoSaveDone = false;

        try {
            while (turnCount < MAX_TURNS) {
                if (signal && signal.aborted) {
                    const err = signal.reason instanceof Error ? signal.reason : new Error('Aborted');
                    err.name = 'AbortError';
                    throw err;
                }
                turnCount++;
                console.log(`[Agent] Step ${turnCount}: Thinking...`);

                this._setState('thinking', { step: turnCount, maxTurns: MAX_TURNS });

                this.emit('thinking', { step: turnCount });

                const pending = drainPendingInputs(this);
                if (pending.length > 0) {
                    for (const text of pending) {
                        this.history.push({ role: 'user', content: text });
                    }
                    this.emit('pending_input_applied', { count: pending.length });
                }

                const autoMemoryPrecheck = Boolean(this.ragConfig && this.ragConfig.autoMemoryPrecheck === true);
                if (autoMemoryPrecheck && !memoryPrecheckDone) {
                    const didLookup = await maybeAutoMemoryLookup({ agent: this, userInput });
                    memoryPrecheckDone = didLookup || memoryPrecheckDone;
                }
                if (signal && signal.aborted) {
                    const err = signal.reason instanceof Error ? signal.reason : new Error('Aborted');
                    err.name = 'AbortError';
                    throw err;
                }

                let currentStepResponse = { content: "", tool_calls: [] };

                const protectRecentMessages = Math.min(
                    this.maxProtectedRecentMessages,
                    Math.max(0, this.history.length - turnStartIndex)
                );
                const pruned = this.contextManager.process(this.history, { protectRecentMessages });
                const llmHistory = pruned.history;
                if (pruned.meta && pruned.meta.dropped > 0) {
                    this.emit('context_truncated', {
                        dropped: pruned.meta.dropped,
                        estimatedTokens: pruned.meta.estimatedTokens,
                        fullHistoryLength: this.history.length,
                        sentHistoryLength: llmHistory.length,
                    });
                }

                currentStepResponse = await runLlmStep({
                    agent: this,
                    llm: this.llm,
                    systemPrompt: this.systemPrompt,
                    llmHistory,
                    turnCount,
                    signal,
                });
                dbg(`Step ${turnCount} LLM response`, { contentLength: currentStepResponse && currentStepResponse.content ? String(currentStepResponse.content).length : 0, toolCalls: Array.isArray(currentStepResponse.tool_calls) ? currentStepResponse.tool_calls.length : 0 });

                const toolFlow = await handleToolCalls({ agent: this, currentStepResponse, turnCount });
                dbg(`Step ${turnCount} tool flow`, { handled: toolFlow.handled, stopTurn: Boolean(toolFlow && toolFlow.stopTurn) });

                if (toolFlow && toolFlow.handled && !toolFlow.stopTurn) {
                    const budgetCheck = evaluateBudgetGovernor({
                        agent: this,
                        turnStartIndex,
                    });
                    if (budgetCheck && budgetCheck.exceeded) {
                        this.emit('budget_fuse_triggered', {
                            reason: budgetCheck.reason,
                            limit: budgetCheck.limit,
                            usage: budgetCheck.usage,
                            promptTokensUsed: budgetCheck.usage && Number.isFinite(Number(budgetCheck.usage.promptTokens)) ? Number(budgetCheck.usage.promptTokens) : 0,
                            promptTokensSource: budgetCheck.usage && budgetCheck.usage.promptTokensSource ? budgetCheck.usage.promptTokensSource : 'turn_ledger',
                            policy: this.runPolicy,
                            timestamp: new Date().toISOString(),
                        });
                        const content = sanitizeFinalResponse(budgetCheck.message || 'Soft budget fuse triggered.');
                        const assistantEntry = { role: 'assistant', content };
                        this.history.push(assistantEntry);
                        finalResponseText = content;
                        this.emit('response', { content: finalResponseText });
                        break;
                    }
                }

                if (!toolFlow.handled) {
                    const guard = applyTurnGuards({
                        agent: this,
                        userInput,
                        turnStartIndex,
                        currentStepResponse,
                        realtimeGuardCount,
                        planGuardCount,
                    });
                    if (guard.shouldContinue) {
                        dbg(`Step ${turnCount} guard triggered`, {
                            realtimeGuardCount: guard.realtimeGuardCount,
                            planGuardCount: guard.planGuardCount,
                        });
                    }
                    realtimeGuardCount = guard.realtimeGuardCount;
                    planGuardCount = guard.planGuardCount;
                    if (guard.shouldContinue) continue;

                    console.log(`[Agent] Final Answer Generated.`);
                    const cleaned = sanitizeFinalResponse(currentStepResponse.content || '');
                    const assistantEntry = { role: 'assistant', content: cleaned };
                    const applied = applyUsageToEntry(assistantEntry, currentStepResponse._usage);
                    this.history.push(assistantEntry);
                    if (applied) {
                        bumpPromptTokenLedger(this, assistantEntry._tokenUsagePrompt);
                        this.emit('token_count', buildTokenUsageInfo(this.history));
                    }
                    finalResponseText = cleaned;

                    if (!memoryAutoSaveDone) {
                        try {
                            memoryAutoSaveDone = await maybeAutoMemorySave({
                                agent: this,
                                userInput,
                            });
                        } catch {
                            // Autosave is best-effort only.
                        }
                    }

                    this.emit('response', { content: finalResponseText });
                    break;
                }

                if (toolFlow && toolFlow.stopTurn) {
                    console.log(`[Agent] Turn stopped: ${toolFlow.stopReason || 'approval_blocked'}`);
                    const content = sanitizeFinalResponse(toolFlow.message || 'Approval was not granted.');
                    const assistantEntry = { role: 'assistant', content };
                    this.history.push(assistantEntry);
                    finalResponseText = content;
                    this.emit('response', { content: finalResponseText });
                    break;
                }
            }
        } catch (error) {
            if (error && error.name === 'AbortError') {
                const reason = this._abortReason || (error && error.message ? String(error.message) : 'aborted');
                this.history.push({ role: 'user', content: `<turn_aborted> ${reason}`.trim() });
                finalResponseText = 'Aborted.';
            } else {
                const message = error && error.message ? String(error.message) : String(error);
                this._setState('error', { message });
                this.emit('autosave', this.dumpSnapshot());
                throw error;
            }
        }

        try {
            return finalizeAgentTurn({
                agent: this,
                finalResponseText,
                turnCount,
                maxTurns: MAX_TURNS,
                dbg,
            });
        } finally {
            this._abortController = null;
            this._abortReason = null;
            this._lastTurnBudgetLedger = this._turnBudgetLedger && typeof this._turnBudgetLedger === 'object'
                ? { ...this._turnBudgetLedger }
                : null;
            this._turnBudgetLedger = null;
            restoreRuntimePolicy(this, runtimeSnapshot);
        }
    }

    async _executeTools(toolCalls) {
        const signal = this._abortController ? this._abortController.signal : null;
        return executeTools(this, toolCalls, { signal });
    }

    async _maybeCompactHistory(options = {}) {
        return await maybeCompactAgentHistory(this, options);
    }

    exportSessionTrace(options = {}) {
        if (!this._traceCollector || typeof this._traceCollector.exportSessionTrace !== 'function') return null;
        return this._traceCollector.exportSessionTrace(options);
    }

    /**
     * Streaming interface for UI consumption.
     */
    async *runAsyncIterator(userInput, options = {}) {
        const signal = (options && options.signal)
            ? options.signal
            : (this._abortController ? this._abortController.signal : undefined);
        if (signal && typeof signal.addEventListener === 'function') {
            if (signal.aborted) this.stop('external_abort');
            else signal.addEventListener('abort', () => this.stop('external_abort'), { once: true });
        }
        const forwardedOptions = { ...options, signal };
        yield* runAgentAsyncIterator(this, userInput, forwardedOptions);
    }

    stop(reason = 'user_stop') {
        this._abortReason = reason;
        if (this._abortController && this._abortController.signal && !this._abortController.signal.aborted) {
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            abortError.reason = reason;
            this._abortController.abort(abortError);
            this.emit('turn_aborted', { reason, timestamp: new Date().toISOString() });
        }
    }
}

module.exports = { Agent };
