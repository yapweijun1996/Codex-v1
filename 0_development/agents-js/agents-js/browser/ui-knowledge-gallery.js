function toText(value) {
    return String(value == null ? '' : value).trim();
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.12;

function buildCaption(ref = {}) {
    const parts = [];
    if (ref.title) parts.push(String(ref.title));
    if (ref.hitId) parts.push(`#${String(ref.hitId)}`);
    if (Number.isFinite(ref.sourcePage)) parts.push(`p.${Math.trunc(ref.sourcePage)}`);
    return parts.join(' · ');
}

const state = {
    refs: [],
    index: 0,
    modal: null,
    image: null,
    caption: null,
    counter: null,
    closeButton: null,
    prevButton: null,
    nextButton: null,
    keydown: null,
    scale: MIN_ZOOM,
    translateX: 0,
    translateY: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragBaseX: 0,
    dragBaseY: 0,
    dragMoved: false,
};

function normalizeIndex(index, length) {
    if (!Number.isFinite(index) || length <= 0) return 0;
    const value = Math.trunc(index);
    if (value < 0) return 0;
    if (value >= length) return length - 1;
    return value;
}

function clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
}

function clampPanToBounds() {
    if (!state.image) return;
    if (state.scale <= MIN_ZOOM) {
        state.translateX = 0;
        state.translateY = 0;
        return;
    }
    const w = Number(state.image.clientWidth || 0);
    const h = Number(state.image.clientHeight || 0);
    if (w <= 0 || h <= 0) return;
    const maxX = ((w * state.scale) - w) / 2;
    const maxY = ((h * state.scale) - h) / 2;
    state.translateX = clamp(state.translateX, -maxX, maxX);
    state.translateY = clamp(state.translateY, -maxY, maxY);
}

function applyImageTransform() {
    if (!state.image) return;
    clampPanToBounds();
    state.image.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`;
    if (state.scale <= MIN_ZOOM) {
        state.image.style.cursor = 'zoom-in';
    } else if (state.dragging) {
        state.image.style.cursor = 'grabbing';
    } else {
        state.image.style.cursor = 'grab';
    }
}

function resetZoomPan() {
    state.scale = MIN_ZOOM;
    state.translateX = 0;
    state.translateY = 0;
    state.dragging = false;
    applyImageTransform();
}

function setZoom(nextScale) {
    state.scale = clamp(Number(nextScale), MIN_ZOOM, MAX_ZOOM);
    if (state.scale <= MIN_ZOOM) {
        state.translateX = 0;
        state.translateY = 0;
    }
    applyImageTransform();
}

function stopDragPan() {
    if (!state.dragging) return;
    state.dragging = false;
    applyImageTransform();
}

function handleImageClick() {
    if (state.dragMoved) {
        state.dragMoved = false;
        return;
    }
    if (state.scale <= MIN_ZOOM) setZoom(2);
    else setZoom(MIN_ZOOM);
}

function handleImageWheel(ev) {
    if (!state.modal || !state.modal.classList.contains('open')) return;
    if (!ev || typeof ev.preventDefault !== 'function') return;
    ev.preventDefault();
    const deltaY = Number(ev.deltaY || 0);
    if (!Number.isFinite(deltaY) || deltaY === 0) return;
    const factor = deltaY < 0 ? (1 + ZOOM_STEP) : (1 - ZOOM_STEP);
    setZoom(state.scale * factor);
}

function handleImageMouseDown(ev) {
    if (!state.image) return;
    if (!ev || Number(ev.button) !== 0) return;
    if (state.scale <= MIN_ZOOM) return;
    state.dragging = true;
    state.dragStartX = Number(ev.clientX || 0);
    state.dragStartY = Number(ev.clientY || 0);
    state.dragBaseX = state.translateX;
    state.dragBaseY = state.translateY;
    state.dragMoved = false;
    applyImageTransform();
    if (typeof ev.preventDefault === 'function') ev.preventDefault();
}

function handleWindowMouseMove(ev) {
    if (!state.dragging) return;
    const nowX = Number(ev && ev.clientX || 0);
    const nowY = Number(ev && ev.clientY || 0);
    const deltaX = nowX - state.dragStartX;
    const deltaY = nowY - state.dragStartY;
    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) state.dragMoved = true;
    state.translateX = state.dragBaseX + deltaX;
    state.translateY = state.dragBaseY + deltaY;
    applyImageTransform();
    if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
}

function updateGalleryView() {
    const refs = Array.isArray(state.refs) ? state.refs : [];
    if (!state.modal || !state.image || !state.caption || refs.length === 0) return;
    state.index = normalizeIndex(state.index, refs.length);
    const ref = refs[state.index] || {};
    state.image.src = toText(ref.src);
    state.image.alt = toText(ref.title || ref.hitId || 'knowledge reference');
    resetZoomPan();
    state.caption.textContent = buildCaption(ref);
    state.counter.textContent = `${state.index + 1} / ${refs.length}`;
    state.prevButton.disabled = refs.length <= 1;
    state.nextButton.disabled = refs.length <= 1;
}

function closeKnowledgeGallery() {
    if (!state.modal) return;
    stopDragPan();
    resetZoomPan();
    state.modal.classList.remove('open');
    state.modal.setAttribute('aria-hidden', 'true');
    if (state.keydown) {
        document.removeEventListener('keydown', state.keydown);
        state.keydown = null;
    }
}

function shiftKnowledgeGallery(step) {
    const refs = Array.isArray(state.refs) ? state.refs : [];
    if (refs.length <= 1) return;
    const next = state.index + Number(step || 0);
    if (next < 0) state.index = refs.length - 1;
    else if (next >= refs.length) state.index = 0;
    else state.index = next;
    updateGalleryView();
}

function ensureKnowledgeGalleryModal() {
    if (state.modal) return state.modal;
    const modal = document.createElement('div');
    modal.className = 'knowledge-gallery-backdrop';
    modal.setAttribute('aria-hidden', 'true');

    const card = document.createElement('div');
    card.className = 'knowledge-gallery-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', 'Knowledge Image Viewer');

    const closeButton = document.createElement('button');
    closeButton.className = 'knowledge-gallery-close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close image viewer');
    closeButton.textContent = 'x';

    const prevButton = document.createElement('button');
    prevButton.className = 'knowledge-gallery-nav prev';
    prevButton.type = 'button';
    prevButton.setAttribute('aria-label', 'Previous image');
    prevButton.textContent = '<';

    const image = document.createElement('img');
    image.className = 'knowledge-gallery-image';
    image.alt = 'knowledge reference';
    image.draggable = false;

    const nextButton = document.createElement('button');
    nextButton.className = 'knowledge-gallery-nav next';
    nextButton.type = 'button';
    nextButton.setAttribute('aria-label', 'Next image');
    nextButton.textContent = '>';

    const meta = document.createElement('div');
    meta.className = 'knowledge-gallery-meta';
    const counter = document.createElement('div');
    counter.className = 'knowledge-gallery-counter';
    const caption = document.createElement('div');
    caption.className = 'knowledge-gallery-caption';
    meta.appendChild(counter);
    meta.appendChild(caption);

    card.appendChild(closeButton);
    card.appendChild(prevButton);
    card.appendChild(image);
    card.appendChild(nextButton);
    card.appendChild(meta);
    modal.appendChild(card);
    document.body.appendChild(modal);

    closeButton.addEventListener('click', closeKnowledgeGallery);
    prevButton.addEventListener('click', () => shiftKnowledgeGallery(-1));
    nextButton.addEventListener('click', () => shiftKnowledgeGallery(1));
    image.addEventListener('load', applyImageTransform);
    image.addEventListener('click', handleImageClick);
    image.addEventListener('wheel', handleImageWheel, { passive: false });
    image.addEventListener('mousedown', handleImageMouseDown);
    image.addEventListener('dragstart', (ev) => {
        if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
    });
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', stopDragPan);
    modal.addEventListener('click', (ev) => {
        if (ev.target === modal) closeKnowledgeGallery();
    });

    state.modal = modal;
    state.image = image;
    state.caption = caption;
    state.counter = counter;
    state.closeButton = closeButton;
    state.prevButton = prevButton;
    state.nextButton = nextButton;
    return modal;
}

function openKnowledgeGallery(references, index) {
    const refs = Array.isArray(references) ? references.filter((v) => v && toText(v.src)) : [];
    if (refs.length === 0) return;
    ensureKnowledgeGalleryModal();
    state.refs = refs;
    state.index = normalizeIndex(index, refs.length);
    updateGalleryView();
    state.modal.classList.add('open');
    state.modal.setAttribute('aria-hidden', 'false');
    if (state.keydown) {
        document.removeEventListener('keydown', state.keydown);
        state.keydown = null;
    }
    state.keydown = (ev) => {
        const key = String(ev && ev.key ? ev.key : '');
        if (key === 'Escape') closeKnowledgeGallery();
        if (key === 'ArrowLeft') shiftKnowledgeGallery(-1);
        if (key === 'ArrowRight') shiftKnowledgeGallery(1);
    };
    document.addEventListener('keydown', state.keydown);
}

export function bindKnowledgeReferenceImageGallery({ imageEl, references, index }) {
    if (!imageEl || typeof imageEl.addEventListener !== 'function') return;
    if (imageEl.dataset && imageEl.dataset.galleryBound === '1') return;
    if (imageEl.dataset) imageEl.dataset.galleryBound = '1';
    imageEl.tabIndex = 0;
    imageEl.setAttribute('role', 'button');
    imageEl.setAttribute('aria-label', 'Open reference image viewer');
    imageEl.addEventListener('click', () => openKnowledgeGallery(references, index));
    imageEl.addEventListener('keydown', (ev) => {
        const key = String(ev && ev.key ? ev.key : '');
        if (key !== 'Enter' && key !== ' ') return;
        if (typeof ev.preventDefault === 'function') ev.preventDefault();
        openKnowledgeGallery(references, index);
    });
}
