(() => {
  const STYLE_ID = "llm-chatbox-style";
  const CSS_TEXT = `:root {
  color-scheme: light;
  font-family: "Inter", "Noto Sans TC", "Segoe UI", system-ui, sans-serif;
  --chat-bg: #f8fafc;
  --chat-panel: #ffffff;
  --chat-border: #d9e0ee;
  --chat-muted: #64748b;
  --chat-strong: #0f172a;
  --chat-accent: #2563eb;
}

.llm_chatbox {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 0.5rem;
  box-sizing: border-box;
}

.llm-chatbox {
  width: min(100%, 360px);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--chat-panel);
  border: 1px solid var(--chat-border);
  border-radius: 14px;
  padding: 0.9rem;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  box-sizing: border-box;
}

.llm-chatbox__header {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.llm-chatbox__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--chat-strong);
}

.llm-chatbox__subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: var(--chat-muted);
}

.llm-chatbox__apikey {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.llm-chatbox__input {
  flex: 1 1 auto;
  padding: 0.45rem 0.65rem;
  border-radius: 10px;
  border: 1px solid var(--chat-border);
  font-size: 0.85rem;
  color: var(--chat-strong);
  background: #f1f5f9;
}

.llm-chatbox__input:focus {
  outline: none;
  border-color: var(--chat-accent);
  background: #fff;
}

.llm-chatbox__button {
  padding: 0.45rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--chat-border);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--chat-accent);
  background: #e0ecff;
  cursor: pointer;
}

.llm-chatbox__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.llm-chatbox__status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: var(--chat-muted);
}

.llm-chatbox__status-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--chat-border);
}

.llm-chatbox__status--active .llm-chatbox__status-dot {
  background: var(--chat-accent);
}

.llm-chatbox__messages {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.5rem;
  border: 1px solid var(--chat-border);
  border-radius: 12px;
  background: var(--chat-bg);
}

.llm-chatbox__bubble {
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  font-size: 0.85rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 100%;
}

.llm-chatbox__bubble--user {
  align-self: flex-end;
  background: var(--chat-accent);
  color: #fff;
}

.llm-chatbox__bubble--assistant {
  align-self: flex-start;
  background: #fff;
  border: 1px solid var(--chat-border);
}

.llm-chatbox__bubble--system {
  align-self: center;
  background: transparent;
  color: var(--chat-muted);
  border: 1px dashed var(--chat-border);
}

.llm-chatbox__composer {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: 1fr auto;
  align-items: end;
}

.llm-chatbox__textarea {
  min-height: 70px;
  resize: vertical;
  border-radius: 12px;
  border: 1px solid var(--chat-border);
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
  font-family: inherit;
}

.llm-chatbox__textarea:focus {
  outline: none;
  border-color: var(--chat-accent);
}

.llm-chatbox__composer-buttons {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 480px) {
  .llm_chatbox {
    padding: 0.5rem 0;
  }

  .llm-chatbox {
    width: 100%;
    border-radius: 0;
    box-shadow: none;
  }
}
`;

  const DEFAULT_SYSTEM_PROMPT =
    "You are GPT-5-mini, a bilingual (中文 + English) assistant who replies succinctly and helpfully.";

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS_TEXT;
    document.head.appendChild(style);
  };

  const loadSharedConfig = (() => {
    let cache = null;
    return async () => {
      if (cache) return cache;
      try {
        const response = await fetch("chat_config.json", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load config");
        const raw = await response.json();
        const systemPrompt = Array.isArray(raw?.system_prompt)
          ? raw.system_prompt.join("\n")
          : typeof raw?.system_prompt === "string"
          ? raw.system_prompt
          : DEFAULT_SYSTEM_PROMPT;
        const fewShotExamples = Array.isArray(raw?.few_shot_examples)
          ? raw.few_shot_examples
              .filter((item) => item && item.user && item.assistant)
              .map((item) => ({ user: item.user, assistant: item.assistant }))
          : [];
        cache = { systemPrompt, fewShotExamples };
      } catch (_) {
        cache = { systemPrompt: DEFAULT_SYSTEM_PROMPT, fewShotExamples: [] };
      }
      return cache;
    };
  })();

  const createElement = (tag, options = {}) => {
    const element = document.createElement(tag);
    if (options.className) {
      element.className = options.className;
    }
    if (options.textContent !== undefined) {
      element.textContent = options.textContent;
    }
    if (options.html !== undefined) {
      element.innerHTML = options.html;
    }
    if (options.attrs) {
      Object.entries(options.attrs).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        element.setAttribute(key, value);
      });
    }
    return element;
  };

  class Chatbox {
    constructor(container, sharedConfig) {
      this.container = container;
      this.config = sharedConfig;
      this.state = {
        apiKey: "",
        busy: false,
        controller: null,
        history: []
      };
      this.build();
      this.bind();
      this.renderSystemMessage();
    }

    build() {
      const title = this.container.getAttribute("data-title") || "GPT-5-mini Chatbox";
      const subtitle =
        this.container.getAttribute("data-subtitle") || "Zero-backend snippet. Bring your own OpenAI API key.";

      const wrapper = createElement("section", { className: "llm-chatbox", attrs: { "data-chatbox": "" } });

      const header = createElement("header", { className: "llm-chatbox__header" });
      header.append(
        createElement("h1", { className: "llm-chatbox__title", textContent: title }),
        createElement("p", { className: "llm-chatbox__subtitle", textContent: subtitle })
      );

      const apiRow = createElement("div", { className: "llm-chatbox__apikey" });
      this.apiInput = createElement("input", {
        className: "llm-chatbox__input",
        attrs: {
          type: "password",
          placeholder: "OpenAI API key (sk-...)",
          autocomplete: "off"
        }
      });
      this.apiToggle = createElement("button", {
        className: "llm-chatbox__button",
        textContent: "Show"
      });
      apiRow.append(this.apiInput, this.apiToggle);

      this.status = createElement("div", { className: "llm-chatbox__status" });
      this.statusDot = createElement("span", { className: "llm-chatbox__status-dot" });
      this.statusText = createElement("span", { textContent: "Idle" });
      this.status.append(this.statusDot, this.statusText);

      this.messages = createElement("section", { className: "llm-chatbox__messages", attrs: { "data-messages": "" } });

      const composer = createElement("footer", { className: "llm-chatbox__composer" });
      this.input = createElement("textarea", {
        className: "llm-chatbox__textarea",
        attrs: { rows: "3", placeholder: "Ask GPT-5-mini anything…" }
      });

      const buttonRow = createElement("div", { className: "llm-chatbox__composer-buttons" });
      this.stopButton = createElement("button", {
        className: "llm-chatbox__button",
        textContent: "Stop"
      });
      this.stopButton.disabled = true;
      this.sendButton = createElement("button", {
        className: "llm-chatbox__button",
        textContent: "Send"
      });
      buttonRow.append(this.stopButton, this.sendButton);

      composer.append(this.input, buttonRow);

      wrapper.append(header, apiRow, this.status, this.messages, composer);
      this.container.innerHTML = "";
      this.container.appendChild(wrapper);
    }

    bind() {
      this.apiInput.addEventListener("change", () => {
        this.state.apiKey = this.apiInput.value.trim();
      });

      this.apiToggle.addEventListener("click", () => {
        const isPassword = this.apiInput.getAttribute("type") === "password";
        this.apiInput.setAttribute("type", isPassword ? "text" : "password");
        this.apiToggle.textContent = isPassword ? "Hide" : "Show";
      });

      this.sendButton.addEventListener("click", () => this.handleSend());
      this.stopButton.addEventListener("click", () => this.abortRequest());

      this.input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          this.handleSend();
        }
      });
    }

    renderSystemMessage() {
      const message =
        "Paste a short-lived OpenAI API key. Responses will show here in mixed 中文 + English.";
      this.appendMessage("system", message);
    }

    appendMessage(role, content) {
      const bubble = createElement("article", {
        className: `llm-chatbox__bubble llm-chatbox__bubble--${role}`
      });
      bubble.textContent = content;
      this.messages.appendChild(bubble);
      this.messages.scrollTop = this.messages.scrollHeight;
    }

    setBusy(isBusy) {
      this.state.busy = isBusy;
      this.sendButton.disabled = isBusy;
      this.stopButton.disabled = !isBusy;
      this.status.classList.toggle("llm-chatbox__status--active", isBusy);
      this.statusText.textContent = isBusy ? "Thinking…" : "Idle";
      if (!isBusy) {
        this.state.controller = null;
      }
    }

    async handleSend() {
      if (this.state.busy) return;
      const question = this.input.value.trim();
      if (!question) {
        return;
      }
      if (!this.state.apiKey) {
        this.appendMessage("system", "Please paste your OpenAI API key first.");
        return;
      }

      this.appendMessage("user", question);
      this.state.history.push({ role: "user", content: question });
      this.input.value = "";

      try {
        const reply = await this.callOpenAI(question);
        if (reply) {
          this.appendMessage("assistant", reply);
          this.state.history.push({ role: "assistant", content: reply });
        } else {
          this.appendMessage("system", "No reply received from OpenAI.");
        }
      } catch (error) {
        if (error.name === "AbortError") {
          this.appendMessage("system", "Generation cancelled.");
        } else {
          this.appendMessage("system", `OpenAI error: ${error.message}`);
        }
      } finally {
        this.setBusy(false);
      }
    }

    async callOpenAI(question) {
      const messages = [];
      if (this.config.systemPrompt) {
        messages.push({ role: "system", content: this.config.systemPrompt });
      }
      if (this.config.fewShotExamples.length) {
        this.config.fewShotExamples.forEach((example) => {
          messages.push({ role: "user", content: example.user });
          messages.push({ role: "assistant", content: example.assistant });
        });
      }
      const recentHistory = this.state.history.slice(-10);
      messages.push(...recentHistory, { role: "user", content: question });

      const controller = new AbortController();
      this.state.controller = controller;
      this.setBusy(true);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.state.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          messages,
          max_completion_tokens: 600
        }),
        signal: controller.signal
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage = data?.error?.message || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }
      return data?.choices?.[0]?.message?.content?.trim() ?? "";
    }

    abortRequest() {
      if (this.state.controller) {
        this.state.controller.abort();
      }
    }
  }

  const bootstrap = async () => {
    ensureStyles();
    const containers = Array.from(document.querySelectorAll(".llm_chatbox"));
    if (!containers.length) return;
    const sharedConfig = await loadSharedConfig();
    containers.forEach((container) => {
      new Chatbox(container, sharedConfig);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
