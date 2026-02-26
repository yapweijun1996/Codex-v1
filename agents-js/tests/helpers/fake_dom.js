function makeClassList(el) {
    return {
        add(name) {
            const n = String(name || '').trim();
            if (!n) return;
            const parts = new Set(String(el.className || '').split(/\s+/).filter(Boolean));
            parts.add(n);
            el.className = Array.from(parts).join(' ');
        },
        remove(name) {
            const n = String(name || '').trim();
            if (!n) return;
            const parts = String(el.className || '').split(/\s+/).filter(Boolean).filter((p) => p !== n);
            el.className = parts.join(' ');
        },
    };
}

class FakeElement {
    constructor(tagName) {
        this.tagName = String(tagName || 'div').toUpperCase();
        this.className = '';
        this.childNodes = [];
        this.parentNode = null;
        this.style = {};
        this.open = undefined;
        this._text = '';
        this._inner = '';
        this._innerSetCount = 0;
        this.classList = makeClassList(this);
    }

    appendChild(node) {
        if (!node) return null;
        if (node && node.__isFragment) {
            for (const c of node.childNodes) this.appendChild(c);
            return node;
        }
        node.parentNode = this;
        this.childNodes.push(node);
        return node;
    }

    remove() {
        if (!this.parentNode) return;
        const idx = this.parentNode.childNodes.indexOf(this);
        if (idx >= 0) this.parentNode.childNodes.splice(idx, 1);
        this.parentNode = null;
    }

    set textContent(v) {
        this._text = String(v == null ? '' : v);
    }

    get textContent() {
        return this._text;
    }

    set innerHTML(v) {
        const s = String(v == null ? '' : v);
        this._inner = s;
        this._innerSetCount += 1;
        this.childNodes = [];

        // Minimal parsing for the message shell only.
        if (s.includes('message-content') && s.includes('message-status')) {
            const content = new FakeElement('div');
            content.className = 'message-content streaming-cursor';
            const status = new FakeElement('div');
            status.className = 'message-status';
            this.appendChild(content);
            this.appendChild(status);
        }
    }

    get innerHTML() {
        return this._inner;
    }

    querySelector(sel) {
        const targetClass = (String(sel || '').startsWith('.')) ? String(sel).slice(1) : '';
        if (!targetClass) return null;
        return findFirstByClass(this, targetClass);
    }
}

function createDocumentFragment() {
    return {
        __isFragment: true,
        childNodes: [],
        appendChild(n) {
            this.childNodes.push(n);
        },
    };
}

function findFirstByClass(root, cls) {
    const want = String(cls || '').trim();
    if (!want) return null;
    const queue = [root];
    while (queue.length) {
        const cur = queue.shift();
        const classes = String(cur.className || '').split(/\s+/).filter(Boolean);
        if (classes.includes(want)) return cur;
        for (const c of cur.childNodes || []) queue.push(c);
    }
    return null;
}

function installFakeDom() {
    const prevDocument = globalThis.document;
    globalThis.document = {
        createElement: (tag) => new FakeElement(tag),
        createDocumentFragment,
    };
    return {
        prevDocument,
        FakeElement,
        findFirstByClass,
        restore() {
            globalThis.document = prevDocument;
        },
    };
}

module.exports = {
    installFakeDom,
    FakeElement,
    findFirstByClass,
};
