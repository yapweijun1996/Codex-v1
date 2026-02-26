function normalizeLogEntry(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') {
        const s = raw.trim();
        return s ? { kind: 'info', text: s } : null;
    }
    if (typeof raw !== 'object') {
        const s = String(raw).trim();
        return s ? { kind: 'info', text: s } : null;
    }
    const kindRaw = raw.kind ? String(raw.kind).trim().toLowerCase() : 'info';
    const textRaw = raw.text ? String(raw.text) : '';
    const text = textRaw.trim();
    if (!text) return null;

    const allow = new Set([
        'info',
        'turn',
        'context',
        'step',
        'plan',
        'action',
        'approval',
        'exec',
        'command',
        'stdout',
        'stderr',
        'result',
        'error',
        'done',
        'note',
    ]);
    const kind = allow.has(kindRaw) ? kindRaw : 'info';

    const childrenRaw = Array.isArray(raw.children) ? raw.children : null;
    const children = childrenRaw
        ? childrenRaw.map((c) => normalizeLogEntry(c)).filter(Boolean)
        : null;

    return children && children.length ? { kind, text, children } : { kind, text };
}

function kindTag(kind) {
    const k = String(kind || '').toLowerCase();
    if (k === 'turn') return 'TURN';
    if (k === 'context') return 'CTX';
    if (k === 'plan') return 'PLAN';
    if (k === 'action') return 'ACT';
    if (k === 'approval') return 'APPROVE';
    if (k === 'exec' || k === 'command') return 'CMD';
    if (k === 'stdout') return 'STDOUT';
    if (k === 'stderr') return 'STDERR';
    if (k === 'result') return 'RESULT';
    if (k === 'error') return 'ERROR';
    if (k === 'done') return 'DONE';
    if (k === 'note') return 'NOTE';
    return 'INFO';
}

function createLogLineNode(doc, { kind, text }, { withTag } = {}) {
    const row = doc.createElement('div');
    row.className = `thought-log-line thought-log-${kind}`;

    if (withTag) {
        const tag = doc.createElement('span');
        tag.className = 'thought-log-tag';
        tag.textContent = kindTag(kind);
        row.appendChild(tag);
    } else {
        row.classList.add('thought-log-child');
    }

    const textEl = doc.createElement('span');
    textEl.className = 'thought-log-text';
    textEl.textContent = text;
    row.appendChild(textEl);
    return row;
}

function createLogGroupNode(doc, entry) {
    const details = doc.createElement('details');
    details.className = `thought-log-group thought-log-${entry.kind}`;
    details.open = false;

    const summary = doc.createElement('summary');
    summary.className = 'thought-log-group-summary';

    const tag = doc.createElement('span');
    tag.className = 'thought-log-tag';
    tag.textContent = kindTag(entry.kind);

    const textEl = doc.createElement('span');
    textEl.className = 'thought-log-text';
    textEl.textContent = entry.text;

    summary.appendChild(tag);
    summary.appendChild(textEl);

    const body = doc.createElement('div');
    body.className = 'thought-log-group-body';

    for (const child of entry.children || []) {
        body.appendChild(createLogLineNode(doc, child, { withTag: false }));
    }

    details.appendChild(summary);
    details.appendChild(body);
    return details;
}

export {
    normalizeLogEntry,
    kindTag,
    createLogLineNode,
    createLogGroupNode,
};
