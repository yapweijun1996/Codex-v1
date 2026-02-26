import { elements } from './ui-dom.js';

export function renderTransparencyNotice() {
    if (!elements.transparencyNotice) return;
    elements.transparencyNotice.innerHTML = `
        <div class="notice-title">How this agent operates</div>
        <div class="notice-section">
            <div class="notice-label">Capabilities</div>
            <ul class="notice-list">
                <li>Calls tools you explicitly approve for high-risk actions.</li>
                <li>Uses your session history to respond within this browser.</li>
                <li>Shows plan, tool calls, and audit trace for transparency.</li>
            </ul>
        </div>
        <div class="notice-section">
            <div class="notice-label">Limits</div>
            <ul class="notice-list">
                <li>May be wrong; verify critical outputs.</li>
                <li>Cannot access data beyond the tools you enable.</li>
                <li>Tool failures or denied approvals can stop a turn.</li>
            </ul>
        </div>
        <div class="notice-section">
            <div class="notice-label">Safety</div>
            <ul class="notice-list">
                <li>High-risk tools require explicit approval.</li>
                <li>You can stop the agent at any time.</li>
            </ul>
        </div>
        <div class="notice-footer">Need help? Check your internal safety SOP.</div>
    `;
}
