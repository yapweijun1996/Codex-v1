function isNearBottom(el, threshold = 24) {
  if (!el) return true;
  const distance = el.scrollHeight - el.clientHeight - el.scrollTop;
  return distance <= threshold;
}

export function bindAfwChatScroll({ chatList } = {}) {
  if (!chatList) return null;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'afw-chat-scroll-btn hidden';
  button.setAttribute('aria-label', 'Scroll to latest messages');
  button.innerHTML = [
    '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">',
    '  <path d="M10 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 3.95a1 1 0 0 1-1.4 0l-4-3.95a1 1 0 0 1 1.4-1.42L9 12.59V4a1 1 0 0 1 1-1Z" fill="currentColor"/>',
    '</svg>',
  ].join('');
  document.body.appendChild(button);

  let pinnedBottom = true;
  let raf = 0;

  const placeButton = () => {
    const rect = chatList.getBoundingClientRect();
    const valid = rect.width > 0 && rect.height > 0;
    if (!valid) {
      button.classList.add('hidden');
      return;
    }
    const left = rect.left + (rect.width / 2);
    const top = rect.bottom - 55;
    button.style.left = `${Math.round(left)}px`;
    button.style.top = `${Math.round(top)}px`;
  };

  const schedulePlace = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      placeButton();
    });
  };

  const scrollToBottom = () => {
    chatList.scrollTop = chatList.scrollHeight;
    pinnedBottom = true;
    button.classList.add('hidden');
    schedulePlace();
  };

  const refreshButton = () => {
    if (isNearBottom(chatList)) {
      pinnedBottom = true;
      button.classList.add('hidden');
      schedulePlace();
      return;
    }
    button.classList.remove('hidden');
    schedulePlace();
  };

  chatList.addEventListener('scroll', () => {
    pinnedBottom = isNearBottom(chatList);
    refreshButton();
  });
  window.addEventListener('resize', schedulePlace);

  button.addEventListener('click', scrollToBottom);
  schedulePlace();

  return {
    onMessageAppended() {
      if (pinnedBottom || isNearBottom(chatList)) {
        scrollToBottom();
        return;
      }
      refreshButton();
    },
    scrollToBottom,
  };
}
