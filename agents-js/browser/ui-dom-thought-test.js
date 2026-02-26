function parseThoughtContent(rawMarkdown) {
    let parsedContent = marked.parse(rawMarkdown || '');

    // More robust detection: Look for "Thought:" at the start
    const thoughtStartRegex = /^<p>(Thought|Thinking|Plan):/i;

    if (!thoughtStartRegex.test(parsedContent)) {
        return parsedContent; // No thought block detected
    }

    // Strategy: Find where the "reasoning" ends and "answer" begins
    // Split into a temporary DOM to analyze structure
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = parsedContent;

    let reasoningElements = [];
    let answerStartIndex = -1;

    const children = Array.from(tempDiv.children);
    for (let i = 0; i < children.length; i++) {
        const el = children[i];
        const text = el.textContent || '';

        // Check if this element starts the actual answer (not reasoning)
        const isAnswerStart = (
            i > 0 && // Not the first element
            !text.match(/^(Thought|Plan|Action|Step \d+):/i) && // Doesn't start with reasoning keywords
            (
                text.match(/^(It is|The |Currently|As of)/i) || // Starts like an answer
                (el.tagName === 'P' && text.length > 20 && !text.includes('Plan:') && !text.includes('Action:'))
            )
        );

        if (isAnswerStart) {
            answerStartIndex = i;
            break;
        }

        reasoningElements.push(el);
    }

    if (reasoningElements.length === 0) {
        return parsedContent;
    }

    // Extract reasoning HTML
    const reasoningHtml = reasoningElements.map(el => el.outerHTML).join('');

    // Extract remaining content (the actual answer)
    const remainingElements = answerStartIndex >= 0 ? children.slice(answerStartIndex) : [];
    const answerHtml = remainingElements.map(el => el.outerHTML).join('');

    // Build collapsible UI
    const thoughtBlock = `
        <div class="reasoning-block">
            <div class="reasoning-toggle">Thought Process</div>
            <div class="reasoning-content">${reasoningHtml}</div>
        </div>
    `;

    return thoughtBlock + answerHtml;
}

function attachReasoningToggles(messageEl) {
    const toggles = messageEl.querySelectorAll('.reasoning-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('open');
            const content = toggle.nextElementSibling;
            if (content) content.classList.toggle('open');
        });
    });
}

export function addMessage(role, content) {
    removeEmptyState();
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;

    let parsedContent = role === 'assistant'
        ? parseThoughtContent(content)
        : marked.parse(content || '');

    messageEl.innerHTML = `<div class="message-content">${parsedContent}</div>`;

    attachReasoningToggles(messageEl);

    elements.messagesArea.appendChild(messageEl);
    scrollToBottom();
}
