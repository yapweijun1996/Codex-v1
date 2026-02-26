const PREVIEW_EVENTS = [
  'click',
  'dblclick',
  'mousedown',
  'mouseup',
  'pointerdown',
  'pointerup',
  'touchstart',
  'touchend',
  'wheel',
];

export function bindAfwPreviewIsolation({ frame, logLine } = {}) {
  if (!frame || typeof frame.addEventListener !== 'function') return;

  const stopToHost = (event) => {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
  };

  for (const type of PREVIEW_EVENTS) {
    frame.addEventListener(type, stopToHost, { capture: true, passive: true });
  }

  if (typeof logLine === 'function') {
    logLine('Preview isolation enabled (iframe events do not bubble to host)');
  }
}
