const { GoogleGenAI } = require("@google/genai");
const { executeWithRetry } = require('./utils/retry');
const { formatToolsForGemini, convertHistory, normalizeToolResultForGemini } = require('./utils/gemini-helpers');
const path = require('path');
try {
    const envPath = path.join(__dirname, '.env');
    require('dotenv').config({ path: envPath });
} catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.warn(`[System] dotenv config skipped: ${message}`);
}

class GeminiLLM {
    /**
     * @param {Object} options
     * @param {String} [options.modelName="gemini-2.5-flash"] - Default to a capable model
     * @param {String} [options.apiKey] - Defaults to process.env.GOOGLE_API_KEY
     * @param {Array} [options.tools] - Tools definitions specifically formatted for Gemini or generic
     */
    constructor({ modelName = "gemini-2.5-flash", apiKey, tools = [] } = {}) {
        this.apiKey = apiKey || process.env.GOOGLE_API_KEY;
        if (!this.apiKey) {
            throw new Error("GOOGLE_API_KEY is missing. Please set it in .env or pass it to constructor.");
        }
        this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
        this.modelName = modelName;
        this.tools = tools;
        this._toolCallSeq = 0;
    }

    /**
     * Convert generic generic tool definitions to Gemini 'functionDeclarations' format
     */
    _formatToolsForGemini(tools) {
        return formatToolsForGemini(tools);
    }

    // Helper to ensure parameter schema matches what Gemini expects (simplified)
    _convertParams(params) {
        return params;
    }

    /**
     * Streaming chat interface
     */
    async *chatStream(systemPrompt, history, options = {}) {
        const geminiHistory = this._convertHistory(history);
        const config = this._buildGenerateConfig(systemPrompt);
        const signal = options && options.signal ? options.signal : undefined;
        const stream = await executeWithRetry(
            () => this.genAI.models.generateContentStream({
                model: this.modelName,
                contents: geminiHistory,
                config,
                ...(signal ? { signal } : null),
            }),
            { maxRetries: 2, baseDelay: 250, maxWaitSeconds: 5 }
        );

        let lastText = '';
        for await (const chunk of stream) {
            const chunkText = chunk.text || '';
            if (chunkText) {
                const delta = chunkText.startsWith(lastText) ? chunkText.slice(lastText.length) : chunkText;
                lastText = chunkText;
                if (delta) yield { type: 'text', delta };
            }

            const functionCalls = this._extractFunctionCalls(chunk);
            if (functionCalls.length > 0) {
                yield {
                    type: 'tool_calls',
                    tool_calls: functionCalls.map((fc, index) => ({
                        id: fc.id || `call_${Date.now()}_${this._toolCallSeq++}`,
                        name: fc.name,
                        arguments: fc.args,
                        thought_signature: fc.thoughtSignature || fc.thought_signature
                    }))
                };
            }
        }
    }

    /**
     * Main chat interface compatible with our Agent
     */
    async chat(systemPrompt, history, options = {}) {
        return await executeWithRetry(() => this._chatInternal(systemPrompt, history, options));
    }

    async _chatInternal(systemPrompt, history, options = {}) {
        const geminiHistory = this._convertHistory(history);
        let response;
        try {
            response = await this.genAI.models.generateContent({
                model: this.modelName,
                contents: geminiHistory,
                config: this._buildGenerateConfig(systemPrompt),
                ...(options && options.signal ? { signal: options.signal } : null),
            });
        } catch (e) {
            console.error("Gemini Request Failed. Debug History:", JSON.stringify(geminiHistory, null, 2));
            throw e;
        }

        const usageMetadata = response && (response.usageMetadata || response.usage);
        const usage = usageMetadata && typeof usageMetadata === 'object'
            ? {
                input_tokens: usageMetadata.promptTokenCount ?? usageMetadata.prompt_tokens,
                cached_input_tokens: usageMetadata.cachedContentTokenCount ?? usageMetadata.cached_prompt_tokens,
                output_tokens: usageMetadata.candidatesTokenCount ?? usageMetadata.completionTokenCount,
                reasoning_output_tokens: usageMetadata.thoughtsTokenCount ?? usageMetadata.reasoningTokenCount,
                total_tokens: usageMetadata.totalTokenCount ?? usageMetadata.total_tokens,
            }
            : undefined;

        const output = {
            content: response.text || null,
            tool_calls: [],
            usage,
        };

        const functionCalls = this._extractFunctionCalls(response);
        if (functionCalls.length > 0) {
            output.tool_calls = functionCalls.map((fc, index) => ({
                id: fc.id || `call_${Date.now()}_${this._toolCallSeq++}`,
                name: fc.name,
                arguments: fc.args,
                thought_signature: fc.thoughtSignature || fc.thought_signature
            }));
            output.content = null;
        }

        return output;
    }

    _convertHistory(history) {
        return convertHistory(history);
    }

    _normalizeToolResultForGemini(parsed) {
        return normalizeToolResultForGemini(parsed);
    }

    _buildGenerateConfig(systemPrompt) {
        const tools = this._formatToolsForGemini(this.tools);
        const config = {
            temperature: 0.7,
            maxOutputTokens: 2048,
            ...(systemPrompt ? { systemInstruction: [{ text: systemPrompt }] } : null),
            ...(tools ? { tools } : null),
        };
        return config;
    }

    _extractFunctionCalls(response) {
        if (!response) return [];
        const candidates = response.candidates || [];
        const parts = candidates[0] && candidates[0].content && Array.isArray(candidates[0].content.parts)
            ? candidates[0].content.parts
            : [];
        const calls = [];
        for (const part of parts) {
            if (part && part.functionCall) {
                calls.push({
                    ...part.functionCall,
                    thoughtSignature: part.thoughtSignature,
                });
            }
        }
        if (calls.length > 0) return calls;
        return response.functionCalls || [];
    }
}

module.exports = { GeminiLLM };
