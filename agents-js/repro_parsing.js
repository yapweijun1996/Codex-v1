const assert = require('assert');
// Mocking DOM elements for Node environment
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><div></div>');
global.document = dom.window.document;
global.window = dom.window;

// Mock marked
const marked = {
    parse: (text) => {
        // Simulating what marked might output for the user's case
        if (text.includes('Thought:')) {
            return `
<p>Thought: I need to use tools to gather required information before answering.
Plan:</p>
<ol>
<li>Call worldtime_now with {"timezone":"Asia/Singapore"}.
Action: Calling tool(s) now.
It is currently <strong>12:22 PM</strong> on Wednesday, February 4, 2026 (SGT).</li>
</ol>
      `.trim();
        }
        return text;
    }
};

function parseThoughtContent(rawMarkdown) {
    let parsedContent = marked.parse(rawMarkdown || '');

    // logic from current ui-dom.js
    const thoughtStartRegex = /^<p>(Thought|Thinking|Plan):/i;

    if (!thoughtStartRegex.test(parsedContent)) {
        console.log('Regex failed to match start');
        return parsedContent;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = parsedContent;

    let reasoningElements = [];
    let answerStartIndex = -1;

    const children = Array.from(tempDiv.children);
    console.log(`Found ${children.length} root children`);

    for (let i = 0; i < children.length; i++) {
        const el = children[i];
        const text = el.textContent || '';
        console.log(`Child ${i} tag=${el.tagName}: "${text.substring(0, 50)}..."`);

        const isAnswerStart = (
            i > 0 &&
            !text.match(/^(Thought|Plan|Action|Step \d+):/i) &&
            (
                text.match(/^(It is|The |Currently|As of)/i) ||
                (el.tagName === 'P' && text.length > 20 && !text.includes('Plan:') && !text.includes('Action:'))
            )
        );

        if (isAnswerStart) {
            console.log(`  -> Detected answer start at index ${i}`);
            answerStartIndex = i;
            break;
        } else {
            console.log(`  -> Considered reasoning`);
        }

        reasoningElements.push(el);
    }

    if (reasoningElements.length === 0) {
        return parsedContent;
    }

    const reasoningHtml = reasoningElements.map(el => el.outerHTML).join('');
    const remainingElements = answerStartIndex >= 0 ? children.slice(answerStartIndex) : [];
    const answerHtml = remainingElements.map(el => el.outerHTML).join('');

    return `
        <div class="reasoning-block">
            <div class="reasoning-toggle">Thought Process</div>
            <div class="reasoning-content">${reasoningHtml}</div>
        </div>
    ` + answerHtml;
}

// Test Case
const rawInput = "Thought: I need to use tools...";
const output = parseThoughtContent(rawInput);
console.log("\n--- OUTPUT HTML ---");
console.log(output);

if (output.includes('reasoning-block')) {
    console.log("\n✅ SUCCESS: Reasoning block created");
} else {
    console.log("\n❌ FAIL: No reasoning block created");
}
