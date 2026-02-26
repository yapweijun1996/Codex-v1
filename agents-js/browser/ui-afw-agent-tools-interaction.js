export function createAfwInteractionTools({ getControlState, getPreviewApi } = {}) {
  const controlState = typeof getControlState === 'function' ? getControlState : () => ({});
  const previewApi = typeof getPreviewApi === 'function' ? getPreviewApi : () => null;

  const requireInteractionEnabled = () => {
    const control = controlState();
    return control.enableInteractionTools ? null : { error: 'Interaction tools disabled by Control Switches' };
  };

  return [
    {
      name: 'preview_click',
      description: 'Click an element inside preview by CSS selector.',
      parameters: {
        type: 'object',
        properties: { selector: { type: 'string', description: 'CSS selector, e.g. #submit' } },
        required: ['selector'],
      },
      func: async ({ selector } = {}) => {
        const lock = requireInteractionEnabled();
        if (lock) return lock;
        const api = previewApi();
        if (!api || typeof api.call !== 'function') return { error: 'Preview API unavailable' };
        const result = await api.call('click', String(selector || ''));
        return { ok: !!(result && result.ok), action: 'click', selector, result };
      },
    },
    {
      name: 'preview_hover',
      description: 'Hover an element inside preview by CSS selector.',
      parameters: {
        type: 'object',
        properties: { selector: { type: 'string', description: 'CSS selector, e.g. .menu-item' } },
        required: ['selector'],
      },
      func: async ({ selector } = {}) => {
        const lock = requireInteractionEnabled();
        if (lock) return lock;
        const api = previewApi();
        if (!api || typeof api.call !== 'function') return { error: 'Preview API unavailable' };
        const result = await api.call('hover', String(selector || ''));
        return { ok: !!(result && result.ok), action: 'hover', selector, result };
      },
    },
    {
      name: 'preview_type',
      description: 'Type text into an input element inside preview by CSS selector.',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector, e.g. #email' },
          text: { type: 'string', description: 'Text to input' },
        },
        required: ['selector', 'text'],
      },
      func: async ({ selector, text } = {}) => {
        const lock = requireInteractionEnabled();
        if (lock) return lock;
        const api = previewApi();
        if (!api || typeof api.call !== 'function') return { error: 'Preview API unavailable' };
        const value = String(text || '');
        const result = await api.call('type', String(selector || ''), value);
        return { ok: !!(result && result.ok), action: 'type', selector, chars: value.length, result };
      },
    },
    {
      name: 'preview_press_key',
      description: 'Press a keyboard key on the current focused element in preview.',
      parameters: {
        type: 'object',
        properties: { key: { type: 'string', description: 'Keyboard key, e.g. Enter, ArrowDown, Escape, a.' } },
        required: ['key'],
      },
      func: async ({ key } = {}) => {
        const lock = requireInteractionEnabled();
        if (lock) return lock;
        const api = previewApi();
        if (!api || typeof api.call !== 'function') return { error: 'Preview API unavailable' };
        const value = String(key || '');
        const result = await api.call('pressKey', value);
        return { ok: !!(result && result.ok), action: 'press_key', key: value, result };
      },
    },
    {
      name: 'preview_drag',
      description: 'Drag from source selector to target selector inside preview.',
      parameters: {
        type: 'object',
        properties: {
          from_selector: { type: 'string', description: 'Source CSS selector.' },
          to_selector: { type: 'string', description: 'Target CSS selector.' },
        },
        required: ['from_selector', 'to_selector'],
      },
      func: async ({ from_selector, to_selector } = {}) => {
        const lock = requireInteractionEnabled();
        if (lock) return lock;
        const api = previewApi();
        if (!api || typeof api.call !== 'function') return { error: 'Preview API unavailable' };
        const from = String(from_selector || '');
        const to = String(to_selector || '');
        const result = await api.call('drag', from, to);
        return { ok: !!(result && result.ok), action: 'drag', from_selector: from, to_selector: to, result };
      },
    },
    {
      name: 'preview_scroll',
      description: 'Scroll preview page to an absolute Y position.',
      parameters: {
        type: 'object',
        properties: { y: { type: 'number', description: 'Target scroll Y, e.g. 500' } },
        required: ['y'],
      },
      func: async ({ y } = {}) => {
        const lock = requireInteractionEnabled();
        if (lock) return lock;
        const api = previewApi();
        if (!api || typeof api.call !== 'function') return { error: 'Preview API unavailable' };
        const target = Number(y || 0);
        const result = await api.call('scrollTo', Number.isFinite(target) ? target : 0);
        return { ok: !!(result && result.ok), action: 'scroll', y: Number.isFinite(target) ? target : 0, result };
      },
    },
  ];
}
