(() => {
  const STYLE_ID = "llm-chatbox-style";
  const THEME = {
    background: "#f5f7fb",
    panel: "#ffffff",
    border: "#d5dce5",
    accent: "#2563eb",
    text: "#1f2937",
    muted: "#6b7280"
  };
  const CSS_TEXT = `:root {
  color-scheme: light;
  font-family: "Inter", "Segoe UI", system-ui, sans-serif;
  --bg: ${THEME.background};
  --panel: ${THEME.panel};
  --border: ${THEME.border};
  --accent: ${THEME.accent};
  --text: ${THEME.text};
  --muted: ${THEME.muted};
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  box-sizing: border-box;
}

body.chat-fullscreen-active {
  overflow: hidden;
}

.chat-fullscreen-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  opacity: 0;
  pointer-events: none;
  transition: opacity 160ms ease;
  z-index: 9998;
}

.chat-fullscreen-overlay.is-active {
  opacity: 1;
  pointer-events: auto;
}

.llm_chatbox {
  position: relative;
  width: 100%;
  max-width: 440px;
  display: flex;
}

.chat-widget {
  flex: 1 1 auto;
  width: 100%;
  max-width: 440px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 0.75rem;
  padding: 1rem;
  min-height: 280px;
  box-sizing: border-box;
}

.chat-widget--fullscreen {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  max-width: none;
  border-radius: 0;
  padding: clamp(1rem, 3vw, 1.75rem);
  z-index: 9999;
}

.chat-widget--fullscreen .chat-widget__messages {
  height: auto;
  max-height: none;
  min-height: 0;
}

.chat-widget__header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: space-between;
  align-items: center;
}

.chat-widget__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.chat-widget__subtitle {
  margin: 0.25rem 0 0;
  color: var(--muted);
  font-size: 0.85rem;
}

.chat-widget__titles {
  flex: 1 1 auto;
  min-width: 0;
}

.chat-widget__apikey {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.chat-input {
  flex: 1 1 200px;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #f8fafc;
  color: var(--text);
}

.chat-input:focus {
  border-color: var(--accent);
  outline: none;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.chat-toggle {
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #eff3ff;
  color: var(--accent);
  font-weight: 600;
  cursor: pointer;
}

.chat-toggle:hover {
  background: #e0e8ff;
}

.chat-widget__messages {
  height: clamp(220px, 45vh, 360px);
  overflow-y: auto;
  padding: 0.75rem;
  border-radius: 10px;
  background: #f4f6fb;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  scroll-behavior: smooth;
}

.chat-bubble {
  max-width: min(90%, 360px);
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-bubble--user {
  align-self: flex-end;
  background: var(--accent);
  color: #ffffff;
}

.chat-bubble--assistant {
  align-self: flex-start;
  background: #ffffff;
  border: 1px solid var(--border);
}

.chat-bubble--sql {
  max-width: 100%;
  width: 100%;
}

.chat-bubble--system {
  align-self: center;
  background: transparent;
  border: 1px dashed var(--border);
  color: var(--muted);
  font-size: 0.8rem;
}

.chat-widget__composer {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: 1fr auto;
  align-items: end;
}

.chat-composer__textarea {
  min-height: 60px;
  resize: vertical;
  border-radius: 8px;
  border: 1px solid var(--border);
  padding: 0.6rem 0.75rem;
  font-size: 0.95rem;
  background: #ffffff;
}

.chat-composer__textarea:focus {
  border-color: var(--accent);
  outline: none;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.chat-composer__send {
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  background: var(--accent);
  color: #ffffff;
  border: none;
  font-weight: 600;
  cursor: pointer;
}

.chat-composer__send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-composer__send:not(:disabled):hover {
  filter: brightness(1.05);
}

.chat-status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--muted);
}

.chat-status__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
}

.chat-status--active .chat-status__dot {
  background: var(--accent);
  animation: pulse 1.2s ease-in-out infinite;
}

.chat-composer__actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.chat-sql-actions {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.4rem;
}

.chat-sql-button {
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: #e5ebff;
  color: var(--accent);
  font-weight: 600;
  cursor: pointer;
}

.chat-sql-button:hover:not(:disabled) {
  background: #d7e0ff;
}

.chat-sql-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-sql-meta {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: var(--muted);
}

.chat-sql-tablewrap {
  margin-top: 0.5rem;
  max-height: 260px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.chat-sql-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.chat-sql-table th,
.chat-sql-table td {
  padding: 0.45rem 0.55rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
  word-break: initial;
}

.chat-sql-table tbody tr:nth-child(even) {
  background: #f8fafc;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.35);
    opacity: 1;
  }
}

@media (max-width: 720px) {
  body {
    padding: 0.75rem;
  }

  .chat-widget {
    max-width: 100%;
  }

  .chat-widget__composer {
    grid-template-columns: 1fr;
  }

  .chat-composer__actions,
  .chat-composer__send {
    width: 100%;
  }
}`;

  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS_TEXT;
    document.head.appendChild(style);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles, { once: true });
  } else {
    injectStyles();
  }

        let instanceCounter = 0;
        const fullscreen = (() => {
          let overlay = null;
          let activeWidget = null;

          const ensureOverlay = () => {
            if (overlay) return overlay;
            overlay = document.createElement("div");
            overlay.className = "chat-fullscreen-overlay";
            overlay.hidden = true;
            document.body.appendChild(overlay);
            overlay.addEventListener("click", (event) => {
              if (event.target === overlay) {
                exit();
              }
            });
            return overlay;
          };

          const lockScroll = () => {
            const body = document.body;
            if (!body || body.dataset.chatScrollLock !== undefined) return;
            body.dataset.chatScrollLock = body.style.overflow || "";
            body.style.overflow = "hidden";
            body.classList.add("chat-fullscreen-active");
          };

          const unlockScroll = () => {
            const body = document.body;
            if (!body || body.dataset.chatScrollLock === undefined) return;
            body.style.overflow = body.dataset.chatScrollLock;
            delete body.dataset.chatScrollLock;
            body.classList.remove("chat-fullscreen-active");
          };

          const dispatchChange = (widget, active) => {
            if (!widget) return;
            widget.dispatchEvent(
              new CustomEvent("chat:fullscreenchange", {
                detail: { active }
              })
            );
          };

          const handleKeydown = (event) => {
            if (event.key === "Escape" && activeWidget) {
              event.preventDefault();
              exit();
            }
          };

          function enter(widget) {
            if (!widget) return;
            ensureOverlay();
            if (activeWidget === widget) return;
            if (activeWidget) {
              exit();
            }
            overlay.hidden = false;
            overlay.classList.add("is-active");
            widget.classList.add("chat-widget--fullscreen");
            widget.setAttribute("data-chat-fullscreen", "1");
            activeWidget = widget;
            lockScroll();
            dispatchChange(widget, true);
            document.addEventListener("keydown", handleKeydown);
          }

          function exit(widget = activeWidget) {
            if (!widget || widget !== activeWidget) return;
            widget.classList.remove("chat-widget--fullscreen");
            widget.removeAttribute("data-chat-fullscreen");
            if (overlay) {
              overlay.classList.remove("is-active");
              overlay.hidden = true;
            }
            unlockScroll();
            dispatchChange(widget, false);
            activeWidget = null;
            document.removeEventListener("keydown", handleKeydown);
          }

          return {
            enter,
            exit,
            isActive(widget) {
              return activeWidget === widget;
            },
            ensureOverlay
          };
        })();

        const createWidgetShell = (container) => {
          const wrapper = document.createElement("main");
          wrapper.className = "chat-widget";
          wrapper.setAttribute("data-chat-widget", "");
          const dataSqlAgent = container.getAttribute("data-sql-agent");
          if (dataSqlAgent) {
            wrapper.setAttribute("data-sql-agent", dataSqlAgent);
          }
          const agentClasses = Array.from(container.classList).filter((cls) => cls.startsWith("agent-"));
          if (agentClasses.length) {
            agentClasses.forEach((cls) => wrapper.classList.add(cls));
          } else {
            wrapper.classList.add("agent-sal-inv");
          }
          wrapper.innerHTML = `
            <header class="chat-widget__header">
              <div class="chat-widget__titles">
                <h1 class="chat-widget__title">GPT-5-mini Chatbox</h1>
                <p class="chat-widget__subtitle">
                  Zero-backend vanilla snippet. Bring your own OpenAI API key.
                </p>
              </div>
              <div class="chat-widget__apikey">
                <input
                  type="password"
                  class="chat-input chat-input--apikey"
                  placeholder="Paste OpenAI API key (sk-...)"
                  data-chat-apikey
                  autocomplete="off"
                />
                <button type="button" class="chat-toggle chat-toggle--mask" data-chat-toggle>
                  Show
                </button>
              </div>
              <button type="button" class="chat-toggle chat-toggle--fullscreen" data-chat-fullscreen>
                Fullscreen
              </button>
              <div class="chat-status chat-status--idle" data-chat-status>
                <span class="chat-status__dot"></span>
                <span data-chat-status-text>Idle</span>
              </div>
            </header>
            <section class="chat-widget__messages" data-chat-messages>
              <article class="chat-bubble chat-bubble--system">
                Paste a short-lived OpenAI API key. AI 可即時生成 PostgreSQL SQL.
              </article>
            </section>
            <footer class="chat-widget__composer">
              <label style="display: contents;">
                <textarea
                  class="chat-composer__textarea"
                  data-chat-input
                  placeholder="Ask GPT-5-mini anything…"
                  rows="3"
                ></textarea>
              </label>
              <div class="chat-composer__actions">
                <button class="chat-toggle chat-toggle--stop" data-chat-stop hidden>
                  Stop
                </button>
                <button class="chat-composer__send" data-chat-send>
                  Send
                </button>
              </div>
            </footer>
          `;
          container.innerHTML = "";
          container.appendChild(wrapper);
          return wrapper;
        };

        const initWidget = (widget, container, instanceId) => {
          if (!widget || !container) return;
          container.dataset.chatInitialized = "1";
          const STORAGE_KEY = "gpt5mini.apikey";
          const storage = {
            get() {
              try {
                return localStorage.getItem(STORAGE_KEY) ?? "";
              } catch (_) {
                return "";
              }
            },
            set(value) {
              try {
                if (value) {
                  localStorage.setItem(STORAGE_KEY, value);
                } else {
                  localStorage.removeItem(STORAGE_KEY);
                }
              } catch (_) {
                /* no-op for private browsing */
              }
            }
          };

          const refs = {
            apiKeyInput: widget.querySelector("[data-chat-apikey]"),
            toggleMaskButton: widget.querySelector("[data-chat-toggle]"),
            fullscreenButton: widget.querySelector("[data-chat-fullscreen]"),
            messages: widget.querySelector("[data-chat-messages]"),
            input: widget.querySelector("[data-chat-input]"),
            sendButton: widget.querySelector("[data-chat-send]"),
            stopButton: widget.querySelector("[data-chat-stop]"),
            status: widget.querySelector("[data-chat-status]"),
            statusText: widget.querySelector("[data-chat-status-text]")
          };

          const savedKey = storage.get();
          if (savedKey) {
            refs.apiKeyInput.value = savedKey;
          }

          const updateFullscreenButton = (active) => {
            if (!refs.fullscreenButton) return;
            refs.fullscreenButton.textContent = active ? "Exit Fullscreen" : "Fullscreen";
            refs.fullscreenButton.setAttribute("aria-pressed", active ? "true" : "false");
          };

          if (refs.fullscreenButton) {
            updateFullscreenButton(fullscreen.isActive(widget));
            refs.fullscreenButton.addEventListener("click", () => {
              if (fullscreen.isActive(widget)) {
                fullscreen.exit(widget);
              } else {
                fullscreen.enter(widget);
              }
            });
            widget.addEventListener("chat:fullscreenchange", (event) => {
              updateFullscreenButton(Boolean(event.detail?.active));
            });
          }

        const defaultSystemPrompt = [
          "You are GPT-5-mini acting as a senior application analyst.",
          "When a request involves data lookup or reporting, respond with PostgreSQL SQL that can run against datasource pos5h_v57uonlinedb_active.",
          "Assume eager execution (lazy = no). Provide short context after the SQL describing what it returns.",
          "Table sample: scm_sal_main (columns: uniquenum_pri, masterfn, companyfn, wflow_status, notes_memo, date_trans, staff_code, staff_unique, staff_desc, party_desc, party_code, party_unique, tag_table_usage).",
          "Database guardrails: only SELECT statements are allowed. Do NOT emit CREATE, DROP, ALTER, INSERT, UPDATE, DELETE, DO blocks, temp tables, or procedural code.",
          "If multiple result sets help, emit separate SELECT statements separated by semicolons inside the code fence (omit inline comments).",
          "When querying scm_sal_main, include `tag_deleted_yn = 'n'` unless the user clearly requests deleted rows.",
          "Helpful column hints: dnum_auto=document number, date_trans=timestamp, staff_code/staff_desc=owner, wflow_status=workflow stage, tag_table_usage=record type (e.g., sal_inv).",
          "Prefer deterministic ordering (e.g., ORDER BY date_trans DESC) when returning document-level rows.",
          "Wrap every SQL answer in a ```sql code fence so the UI can detect and execute it, then add a short explanation after the fence.",
          "Return only SQL that is valid for PostgreSQL in this environment."
        ].join(" ");

        const defaultPrompts = {
          planner: {
            system: [
              "You are the Planning Agent for an ERP AI copilot.",
              "Output JSON object {\"plan\":[...],\"clarify_question\":null}.",
              "Steps: clarify, sql, sql_sal_inv, summary, chat, doc.",
              "Use sql_sal_inv when the task is explicitly about sales invoices (tag_table_usage = 'sal_inv'); otherwise use sql.",
              "Pick clarify when info missing (include question). Prefer summary after any sql-type step.",
              "Default: scm_sal_main queries filter tag_deleted_yn = 'n'."
            ].join(" "),
            examples: []
          },
          sqlAgent: {
            system: [
              "You build PostgreSQL SELECT statements for datasource pos5h_v57uonlinedb_active.",
              "Return SQL only (no comments, no fences). READ ONLY.",
              "Include tag_deleted_yn = 'n' for scm_sal_main unless told otherwise.",
              "Upper trim dnum_auto comparisons.",
              "Reply NO_VALID_QUERY when impossible."
            ].join(" "),
            examples: []
          },
          narrator: {
            system: [
              "You are the narrator. Reply in Mandarin-English mix.",
              "Include executed SQL inside ```sql``` block (label executed).",
              "Summarize findings, highlight anomalies, give next step.",
              "List key filters/assumptions briefly."
            ].join(" "),
            examples: []
          }
        };

        const defaultSqlAgents = {
          core: {
            system: defaultPrompts.sqlAgent.system,
            examples: defaultPrompts.sqlAgent.examples
          },
          salInv: {
            system: [
              "You are the Sales Invoice SQL Agent for PostgreSQL datasource pos5h_v57uonlinedb_active.",
              "Return only executable PostgreSQL SELECT statements (no comments, no code fences).",
              "Focus on sales invoice records stored in scm_sal_main with tag_table_usage = 'sal_inv'.",
              "Always include filters tag_deleted_yn = 'n' and tag_table_usage = 'sal_inv' unless the user explicitly opts out.",
              "Compare document numbers using upper(trim(dnum_auto)) when filtering specific invoices.",
              "If a valid read-only query cannot be built, reply exactly with NO_VALID_QUERY."
            ].join(" "),
            examples: [
              {
                user: "{\"question\":\"Past 7 day latest sales invoices\",\"filters\":[\"date_trans >= CURRENT_DATE - INTERVAL '7 days'\"],\"notes\":\"top 5 by recency\"}",
                assistant: "SELECT\n    s.dnum_auto,\n    s.party_desc,\n    s.date_trans,\n    s.wflow_status,\n    s.staff_desc\nFROM scm_sal_main AS s\nWHERE s.tag_deleted_yn = 'n'\n  AND s.tag_table_usage = 'sal_inv'\n  AND s.date_trans >= CURRENT_DATE - INTERVAL '7 days'\nORDER BY s.date_trans DESC\nLIMIT 5"
              },
              {
                user: "{\"question\":\"Invoice SIV-10023 status\",\"filters\":[\"dnum_auto = 'SIV-10023'\"],\"notes\":\"single document lookup\"}",
                assistant: "SELECT\n    s.dnum_auto,\n    s.party_desc,\n    s.wflow_status,\n    s.notes_memo,\n    s.date_trans\nFROM scm_sal_main AS s\nWHERE s.tag_deleted_yn = 'n'\n  AND s.tag_table_usage = 'sal_inv'\n  AND upper(trim(s.dnum_auto)) = upper(trim('SIV-10023'))"
              }
            ]
          }
        };

        const DEFAULT_SQL_AGENT_KEY = "core";

        /** Minimal reactive state for the widget. */
        const state = {
          apiKey: savedKey,
          messages: [],
          conversation: [],
          streaming: false,
          abortController: null,
          sqlAgentKey: DEFAULT_SQL_AGENT_KEY
        };

        const SQL_ENDPOINT = "sql_runner.cfm";
        const CONFIG_ENDPOINT = "chat_config.json";
        const DEBUG_STORAGE_KEY = "gpt5mini.debug";

        const normalizePromptSection = (section, fallback) => {
          const normalized = {
            system: fallback.system,
            examples: fallback.examples ? [...fallback.examples] : []
          };
          if (section) {
            if (Array.isArray(section.system_prompt) && section.system_prompt.length) {
              normalized.system = section.system_prompt.join("\n");
            } else if (typeof section.system_prompt === "string" && section.system_prompt.trim()) {
              normalized.system = section.system_prompt.trim();
            }
            if (Array.isArray(section.examples)) {
              normalized.examples = section.examples
                .filter((item) => item && item.user && item.assistant)
                .map((item) => ({ user: item.user, assistant: item.assistant }));
            }
          }
          return normalized;
        };

        const config = {
          loaded: false,
          systemPrompt: defaultSystemPrompt,
          fewShotExamples: [],
          debug: false,
          prompts: {
            planner: normalizePromptSection(null, defaultPrompts.planner),
            narrator: normalizePromptSection(null, defaultPrompts.narrator)
          },
          sqlAgents: {
            [DEFAULT_SQL_AGENT_KEY]: normalizePromptSection(null, defaultSqlAgents.core),
            salInv: normalizePromptSection(null, defaultSqlAgents.salInv)
          }
        };

        const debug = {
          enabled: false,
          init() {
            const url = new URL(window.location.href);
            if (url.searchParams.has("debug")) {
              const flag = url.searchParams.get("debug");
              this.enabled = flag === null || flag === "" || flag === "1" || flag.toLowerCase() === "true";
              try {
                localStorage.setItem(DEBUG_STORAGE_KEY, this.enabled ? "1" : "0");
              } catch (_) {
                /* ignore */
              }
            } else {
              try {
                this.enabled = localStorage.getItem(DEBUG_STORAGE_KEY) === "1";
              } catch (_) {
                this.enabled = false;
              }
            }
          },
          log(label, ...args) {
            if (!this.enabled) return;
            console.log(`[GPT5-mini#${instanceId}][${label}]`, ...args);
          },
          group(label, cb) {
            if (!this.enabled) return cb?.();
            console.group(`[GPT5-mini#${instanceId}][${label}]`);
            try {
              cb?.();
            } finally {
              console.groupEnd();
            }
          }
        };
        debug.init();

        const toAgentKey = (value) => {
          if (!value) return "";
          return String(value)
            .trim()
            .split(/[\s._-]+/)
            .filter(Boolean)
            .map((part, index) => {
              const lower = part.toLowerCase();
              if (index === 0) return lower;
              return lower.charAt(0).toUpperCase() + lower.slice(1);
            })
            .join("");
        };

        const ensureSqlAgentKey = (key) => {
          if (key && config.sqlAgents[key]) {
            return key;
          }
          if (!config.sqlAgents[DEFAULT_SQL_AGENT_KEY]) {
            config.sqlAgents[DEFAULT_SQL_AGENT_KEY] = normalizePromptSection(null, defaultSqlAgents.core);
          }
          return DEFAULT_SQL_AGENT_KEY;
        };

        const resolveWidgetSqlAgent = () => {
          const candidates = [];
          const attr = widget.getAttribute("data-sql-agent") || container.getAttribute("data-sql-agent");
          if (attr) {
            candidates.push(attr);
          }
          const collectAgentClasses = (element) => {
            if (!element || !element.classList) return;
            element.classList.forEach((cls) => {
              if (cls.startsWith("agent-")) {
                candidates.push(cls.slice("agent-".length));
              }
            });
          };
          collectAgentClasses(container);
          collectAgentClasses(widget);
          for (let i = 0; i < candidates.length; i += 1) {
            const candidateKey = toAgentKey(candidates[i]);
            if (candidateKey && config.sqlAgents[candidateKey]) {
              return candidateKey;
            }
          }
          return null;
        };

        const setActiveSqlAgent = (key, reason = "manual") => {
          const previous = state.sqlAgentKey;
          const resolved = ensureSqlAgentKey(key);
          state.sqlAgentKey = resolved;
          debug.log("sql-agent:set", { reason, requested: key, active: resolved, previous });
          return resolved;
        };

        const resolveSqlAgentFromStep = (step) => {
          if (!step || typeof step !== "string") return null;
          const lowered = step.toLowerCase();
          if (lowered === "sql") return null;
          if (!lowered.startsWith("sql_")) return null;
          const suffix = step.slice(4);
          const normalized = toAgentKey(suffix);
          return normalized && config.sqlAgents[normalized] ? normalized : null;
        };

        const getSqlAgentConfig = (key) => {
          const resolvedKey = ensureSqlAgentKey(key);
          const prompt = config.sqlAgents[resolvedKey] || config.sqlAgents[DEFAULT_SQL_AGENT_KEY];
          return {
            key: resolvedKey,
            prompt
          };
        };

        setActiveSqlAgent(resolveWidgetSqlAgent() || state.sqlAgentKey, "startup");

        function escapeHtml(value) {
          return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
        }

        function extractSqlFromMessage(message) {
          if (!message) return "";
          const codeMatch = message.match(/```sql\s*([\s\S]+?)```/i);
          if (codeMatch) {
            return codeMatch[1].trim();
          }
          return "";
        }

        function splitSqlStatements(sql) {
          if (!sql) return [];
          return sql
            .split(/;\s*(?:\r?\n|$)/)
            .map((stmt) => {
              const trimmed = stmt.trim();
              if (!trimmed) return "";
              const lines = trimmed
                .split(/\r?\n/)
                .filter((line) => !line.trim().startsWith("--"))
                .join("\n");
              return lines.trim();
            })
            .filter(Boolean)
            .filter((stmt) => /^select\b/i.test(stmt));
        }

        function normalizeSqlPayload(payload) {
          if (!payload || typeof payload !== "object") return null;
          const lowered = {};
          Object.keys(payload).forEach((key) => {
            lowered[key.toLowerCase()] = payload[key];
          });
          const rows =
            Array.isArray(lowered.rows) && lowered.rows.length
              ? lowered.rows
              : Array.isArray(lowered.data) && lowered.data.length
              ? lowered.data
              : Array.isArray(lowered.result) && lowered.result.length
              ? lowered.result
              : [];
          const columns = Array.isArray(lowered.columns) ? lowered.columns : [];
          let rowCountValue = lowered.rowcount ?? lowered["row_count"] ?? lowered.totalrows ?? lowered.total ?? rows.length;
          if (typeof rowCountValue === "string") {
            const parsed = Number(rowCountValue);
            if (!Number.isNaN(parsed)) {
              rowCountValue = parsed;
            }
          }
          const rowCount =
            typeof rowCountValue === "number" && Number.isFinite(rowCountValue)
              ? rowCountValue
              : rows.length;
          return {
            ok: lowered.ok !== undefined ? lowered.ok !== false : !lowered.error && !lowered.message,
            error: lowered.error || lowered.message,
            detail: lowered.detail,
            rows,
            columns,
            rowCount,
            maxRows: lowered.maxrows ?? lowered.limit ?? null
          };
        }

        function renderSqlResult(payload) {
          const normalized = normalizeSqlPayload(payload);
          if (!normalized || normalized.ok === false || normalized.error) {
            const msg = normalized?.error || normalized?.detail || "SQL execution failed.";
            return `SQL error: ${escapeHtml(msg)}`;
          }
          let columns = Array.isArray(normalized.columns) && normalized.columns.length ? normalized.columns : [];
          const rows = Array.isArray(normalized.rows) ? normalized.rows : [];
          const rowCount = Number(normalized.rowCount || rows.length || 0);
          const limitApplied = normalized.maxRows || null;

          if (!columns.length && rows.length) {
            columns = Object.keys(rows[0]);
          }

          if (!rowCount) {
            const extra = limitApplied ? ` (limit ${limitApplied})` : "";
            return `<p class="chat-sql-meta">SQL executed successfully but returned no rows${extra}.</p>`;
          }

          const headerCells = columns.map((col) => `<th>${escapeHtml(col)}</th>`).join("");
          const bodyRows = rows
            .map((row) => {
              const cells = columns.map((col) => `<td>${escapeHtml(row[col])}</td>`).join("");
              return `<tr>${cells}</tr>`;
            })
            .join("");

          const limitNote =
            limitApplied && rowCount >= limitApplied
              ? ` Showing first ${rows.length} rows (limit ${limitApplied}).`
              : "";

          return [
            `<p class="chat-sql-meta">SQL result: ${rowCount} row${rowCount === 1 ? "" : "s"}.${limitNote}</p>`,
            `<div class="chat-sql-tablewrap"><table class="chat-sql-table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`
          ].join("");
        }

        function addSqlResultToState({ sql, payload }) {
          if (!sql || !payload) return;
          const normalized = normalizeSqlPayload(payload);
          if (!normalized || normalized.ok === false || normalized.error) return;
          let columns = Array.isArray(normalized.columns) ? normalized.columns : [];
          const rows = Array.isArray(normalized.rows) ? normalized.rows : [];
          const rowCount = Number(normalized.rowCount || rows.length || 0);
          if (!columns.length && rows.length) {
            columns = Object.keys(rows[0]);
          }
          const previewRows = rows.slice(0, 5).map((row, index) => {
            const cells = columns
              .map((col) => `${col}: ${row[col]}`)
              .join(", ");
            return `Row ${index + 1}: ${cells}`;
          });
          const summary = [`SQL result rows: ${rowCount}`].concat(previewRows);
          state.messages.push({
            role: "assistant",
            content: summary.join("\n")
          });
        }

        function attachSqlRunner(bubble, sql) {
          if (!bubble || !sql) return;
          if (bubble.querySelector(".chat-sql-actions")) return;

          const actions = document.createElement("div");
          actions.className = "chat-sql-actions";

          const runButton = document.createElement("button");
          runButton.type = "button";
          runButton.className = "chat-sql-button";
          runButton.textContent = "Run SQL";

          actions.appendChild(runButton);
          bubble.appendChild(actions);

          runButton.addEventListener("click", () => executeSql(sql, runButton));
        }

        async function runSqlStatement(statement, label) {
          if (!statement) return;
          debug.log("sql:execute:start", {
            label,
            preview: statement.slice(0, 160)
          });
          const body = new URLSearchParams();
          body.set("sql", statement);

          const response = await fetch(SQL_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString()
          });

          const rawPayload = await response.json().catch(() => null);
          debug.log("sql:execute:response", {
            status: response.status,
            ok: response.ok,
            rowCount: rawPayload?.rowCount ?? rawPayload?.ROWCOUNT ?? rawPayload?.rows?.length
          });
          const normalized = normalizeSqlPayload(rawPayload);
          if (!response.ok || !normalized || normalized.ok === false || normalized.error) {
            const errorMessage = normalized?.error || normalized?.detail || `Request failed (${response.status})`;
            throw new Error(label ? `${label} - ${errorMessage}` : errorMessage);
          }

          const tableHtml = renderSqlResult(rawPayload);
          const prefix = label ? `<p class="chat-sql-meta">${escapeHtml(label)}</p>` : "";
          appendBubble("assistant", prefix + tableHtml, { asHtml: true, extraClass: "chat-bubble--sql" });
          addSqlResultToState({ sql: statement, payload: rawPayload });
          debug.log("sql:execute:success", {
            label,
            rowCount: normalized?.rowCount ?? 0
          });
          return {
            label,
            statement,
            normalized,
            raw: rawPayload
          };
        }

        async function executeSql(sql, button) {
          if (!sql) return;
          const statements = splitSqlStatements(sql);
          if (!statements.length) return;
          debug.log("sql:queue", { total: statements.length });
          const aggregated = [];
          const trigger = button;
          if (trigger) {
            trigger.disabled = true;
            trigger.textContent = "Running…";
          }
          setStatus(statements.length > 1 ? "Running SQL batch…" : "Querying…", true);

          try {
            for (let i = 0; i < statements.length; i += 1) {
              const statement = statements[i];
              const label = statements.length > 1 ? `SQL ${i + 1} of ${statements.length}` : "";
              // eslint-disable-next-line no-await-in-loop
              const result = await runSqlStatement(statement, label);
              if (result) {
                aggregated.push(result);
              }
            }
          } catch (error) {
            appendBubble("assistant", `SQL error: ${error.message}`);
            debug.log("sql:error", error.message);
          } finally {
            if (trigger) {
              trigger.disabled = false;
              trigger.textContent = "Run SQL";
            }
            setStatus("Idle", false);
            debug.log("sql:complete");
          }
          return aggregated;
        }

        function evaluateSqlOpportunity(message, bubble, options = {}) {
          const { autoRun = true } = options;
          const sql = extractSqlFromMessage(message);
          if (!sql) return;
          debug.log("sql:detected", { length: sql.length });
          attachSqlRunner(bubble, sql);
          if (autoRun) {
            executeSql(sql).catch((error) => {
              debug.log("sql:autorun-error", error.message);
            });
          }
        }

        const getRecentConversation = (limit = 6) => state.conversation.slice(-limit);

        const extractJsonObject = (content) => {
          try {
            return JSON.parse(content);
          } catch (_) {
            const start = content.indexOf("{");
            const end = content.lastIndexOf("}");
            if (start === -1 || end === -1 || end <= start) return null;
            try {
              return JSON.parse(content.slice(start, end + 1));
            } catch (error) {
              debug.log("json:parse-error", error.message);
              return null;
            }
          }
        };

        async function callOpenAI({
          label,
          system,
          examples = [],
          messages = [],
          maxCompletionTokens = 900
        }) {
          const chatMessages = [];
          if (system) {
            chatMessages.push({ role: "system", content: system });
          }
          examples.forEach((example) => {
            chatMessages.push({ role: "user", content: example.user });
            chatMessages.push({ role: "assistant", content: example.assistant });
          });
          messages.forEach((message) => chatMessages.push(message));

          debug.log("openai:call:start", { label, messageCount: chatMessages.length });
          const controller = new AbortController();
          state.abortController = controller;

          try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${state.apiKey}`
              },
              body: JSON.stringify({
                model: "gpt-5-mini",
                max_completion_tokens: maxCompletionTokens,
                messages: chatMessages
              }),
              signal: controller.signal
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              const errorMessage = data?.error?.message || `OpenAI ${response.status}`;
              throw new Error(errorMessage);
            }
            const text = data.choices?.[0]?.message?.content?.trim() ?? "";
            debug.log("openai:call:end", { label, length: text.length });
            return text;
          } catch (error) {
            if (error.name === "AbortError") {
              debug.log("openai:call:aborted", label);
              throw error;
            }
            debug.log("openai:call:error", error.message);
            throw error;
          } finally {
            if (state.abortController === controller) {
              state.abortController = null;
            }
          }
        }

        const summarizeSqlResults = (results = []) =>
          results.map((entry) => {
            const normalized = entry?.normalized ?? {};
            const rows = Array.isArray(normalized.rows) ? normalized.rows : [];
            return {
              label: entry?.label ?? null,
              rowCount: normalized.rowCount ?? rows.length ?? 0,
              columns: Array.isArray(normalized.columns) ? normalized.columns.slice(0, 10) : [],
              sampleRows: rows.slice(0, 3)
            };
          });

        async function runPlanner(question) {
          const history = getRecentConversation();
          const plannerInput = JSON.stringify(
            {
              question,
              history,
              active_sql_agent: state.sqlAgentKey
            },
            null,
            2
          );
          const content = await callOpenAI({
            label: "planner",
            system: config.prompts.planner.system,
            examples: config.prompts.planner.examples,
            messages: [{ role: "user", content: plannerInput }],
            // temperature defaults to model setting
          });
          const parsed = extractJsonObject(content);
          if (!parsed || !Array.isArray(parsed.plan)) {
            throw new Error("Planner returned unexpected format.");
          }
          const clarifyQuestion = typeof parsed.clarify_question === "string" ? parsed.clarify_question : null;
          debug.log("planner:plan", { plan: parsed.plan, clarifyQuestion });
          return { plan: parsed.plan, clarifyQuestion };
        }

        async function runSqlAgent({ question, plan, agentKey, sqlStep }) {
          const { key: resolvedAgentKey, prompt } = getSqlAgentConfig(agentKey);
          const history = getRecentConversation(6);
          const sqlInput = JSON.stringify(
            {
              question,
              plan,
              history,
              agent: resolvedAgentKey,
              sql_step: sqlStep || null
            },
            null,
            2
          );
          const sql = await callOpenAI({
            label: `sql-agent:${resolvedAgentKey}`,
            system: prompt.system,
            examples: prompt.examples,
            messages: [{ role: "user", content: sqlInput }]
          });
          const trimmed = sql.trim();
          if (!trimmed || trimmed.toUpperCase() === "NO_VALID_QUERY") {
            throw new Error("SQL agent could not build a valid query.");
          }
          debug.log("sql-agent:output", { agent: resolvedAgentKey, text: trimmed });
          return trimmed;
        }

        async function runNarrator({ question, plan, clarifyQuestion, sqlText, sqlResults }) {
          const payload = {
            question,
            plan,
            clarify_question: clarifyQuestion,
            sql_executed: sqlText,
            sql_results: summarizeSqlResults(sqlResults),
            history: getRecentConversation(6)
          };
          const narratorInput = JSON.stringify(payload, null, 2);
          const message = await callOpenAI({
            label: "narrator",
            system: config.prompts.narrator.system,
            examples: config.prompts.narrator.examples,
            messages: [{ role: "user", content: narratorInput }],
            maxCompletionTokens: 700
          });
          debug.log("narrator:output", message);
          return message.trim();
        }

        const setStatus = (text, active) => {
          refs.statusText.textContent = text;
          refs.status.classList.toggle("chat-status--active", active);
          refs.status.classList.toggle("chat-status--idle", !active);
        };

        const appendBubble = (role, content, options = {}) => {
          const bubble = document.createElement("article");
          bubble.className = `chat-bubble chat-bubble--${role}`;
          const { asHtml = false, extraClass = "" } = options;
          if (extraClass) {
            bubble.classList.add(extraClass);
          }
          if (asHtml) {
            bubble.innerHTML = content;
          } else {
            bubble.textContent = content;
          }
          refs.messages.appendChild(bubble);
          refs.messages.scrollTop = refs.messages.scrollHeight;
          return bubble;
        };

        const toggleForm = (disabled) => {
          refs.sendButton.disabled = disabled;
          refs.input.readOnly = disabled;
        };

        const guardApiKey = () => {
          const value = refs.apiKeyInput.value.trim();
          state.apiKey = value;
          storage.set(value);
          refs.sendButton.disabled = !value;
          debug.log("apikey:update", value ? "set" : "cleared");
        };

        const handleToggleMask = () => {
          const isMasked = refs.apiKeyInput.type === "password";
          refs.apiKeyInput.type = isMasked ? "text" : "password";
          refs.toggleMaskButton.textContent = isMasked ? "Hide" : "Show";
        };

        const abortStreaming = () => {
          if (state.abortController) {
            state.abortController.abort();
            state.abortController = null;
          }
        };

        const resetStreamingState = () => {
          state.streaming = false;
          toggleForm(false);
          refs.stopButton.hidden = true;
          setStatus("Idle", false);
        };

        const handleSend = async () => {
          const prompt = refs.input.value.trim();
          if (!prompt || !state.apiKey || state.streaming) return;
          if (!state.messages.length) {
            bootstrapConversation();
          }

          refs.input.value = "";
          state.messages.push({ role: "user", content: prompt });
          state.conversation.push({ role: "user", content: prompt });
          appendBubble("user", prompt);

          state.streaming = true;
          toggleForm(true);
          refs.stopButton.hidden = false;
          setStatus("Planning…", true);
          debug.log("pipeline:start", { prompt });

          let finalResponse = "";

          try {
            const plannerOutput = await runPlanner(prompt);
            const plannerPlan = Array.isArray(plannerOutput.plan) ? [...plannerOutput.plan] : [];
            debug.log("pipeline:plan", plannerPlan);

            if (!plannerPlan.length) {
              plannerPlan.push("chat");
            }

            if (plannerPlan[0] === "clarify") {
              const clarifyMessage = plannerOutput.clarifyQuestion || "需要更多細節，請補充需求 (Need more context)。";
              const clarifyBubble = appendBubble("assistant", clarifyMessage);
              evaluateSqlOpportunity(clarifyMessage, clarifyBubble, { autoRun: false });
              state.messages.push({ role: "assistant", content: clarifyMessage });
              state.conversation.push({ role: "assistant", content: clarifyMessage });
              finalResponse = clarifyMessage;
              return;
            }

            const sqlPlanStep = plannerPlan.find(
              (step) => typeof step === "string" && (step === "sql" || step.startsWith("sql_"))
            );

            const sanitizedPlan = [];
            const seen = new Set();
            plannerPlan.forEach((step) => {
              if (typeof step !== "string") return;
              if (step === "sql" || step.startsWith("sql_")) {
                if (!seen.has("sql")) {
                  sanitizedPlan.push("sql");
                  seen.add("sql");
                }
                return;
              }
              if ((step === "summary" || step === "chat") && !seen.has(step)) {
                sanitizedPlan.push(step);
                seen.add(step);
              }
            });

            if (!sanitizedPlan.length) {
              sanitizedPlan.push("chat");
              seen.add("chat");
            }

            if (sanitizedPlan.includes("sql") && !sanitizedPlan.includes("summary")) {
              sanitizedPlan.push("summary");
            }

            const plan = sanitizedPlan;
            const requestedSqlAgent = resolveSqlAgentFromStep(sqlPlanStep);
            const activeSqlAgentKey = requestedSqlAgent
              ? setActiveSqlAgent(requestedSqlAgent, "plan-step")
              : setActiveSqlAgent(state.sqlAgentKey, "carry-forward");
            debug.log("pipeline:sql-agent", { step: sqlPlanStep, agent: activeSqlAgentKey });

            let sqlText = null;
            let sqlResults = [];

            if (plan.includes("sql")) {
              setStatus("Generating SQL…", true);
              sqlText = await runSqlAgent({
                question: prompt,
                plan,
                agentKey: activeSqlAgentKey,
                sqlStep: sqlPlanStep
              });
              const sqlMessage = `Executed SQL 已執行：\n\n\`\`\`sql\n${sqlText}\n\`\`\``;
              const sqlBubble = appendBubble("assistant", sqlMessage);
              evaluateSqlOpportunity(sqlMessage, sqlBubble, { autoRun: false });
              state.messages.push({ role: "assistant", content: sqlMessage });
              state.conversation.push({ role: "assistant", content: sqlMessage });
              setStatus("Running SQL…", true);
              sqlResults = (await executeSql(sqlText)) || [];
            }

            if (plan.includes("summary") || plan.includes("chat")) {
              setStatus("Summarizing…", true);
              finalResponse = await runNarrator({
                question: prompt,
                plan,
                clarifyQuestion: plannerOutput.clarifyQuestion,
                sqlText,
                sqlResults
              });
            }

            if (!finalResponse) {
              finalResponse = "✅ 任務完成。";
            }

            const finalBubble = appendBubble("assistant", finalResponse);
            evaluateSqlOpportunity(finalResponse, finalBubble, { autoRun: false });
            state.messages.push({ role: "assistant", content: finalResponse });
            state.conversation.push({ role: "assistant", content: finalResponse });
            setStatus("Idle", false);
          } catch (error) {
            if (error.name === "AbortError") {
              const cancelMessage = "⚠️ 已取消此次操作 (Request aborted).";
              appendBubble("assistant", cancelMessage);
              state.messages.push({ role: "assistant", content: cancelMessage });
              state.conversation.push({ role: "assistant", content: cancelMessage });
            } else {
              appendBubble("assistant", `⚠️ ${error.message}`);
              state.messages.push({ role: "assistant", content: `⚠️ ${error.message}` });
              state.conversation.push({ role: "assistant", content: `⚠️ ${error.message}` });
              debug.log("pipeline:error", error.message);
            }
          } finally {
            resetStreamingState();
            debug.log("pipeline:end", { finalResponse, sqlAgent: state.sqlAgentKey });
          }
        };

        refs.sendButton.addEventListener("click", handleSend);
        refs.input.addEventListener("keydown", (event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSend();
          }
        });
        refs.apiKeyInput.addEventListener("input", guardApiKey);
        refs.toggleMaskButton.addEventListener("click", handleToggleMask);
        refs.stopButton.addEventListener("click", () => {
          abortStreaming();
        });

        window.addEventListener("beforeunload", abortStreaming);

        async function loadConfig() {
          try {
            const response = await fetch(CONFIG_ENDPOINT, { cache: "no-store" });
            if (!response.ok) throw new Error(`Failed to load chat_config.json (${response.status})`);
            const payload = await response.json();
            if (Array.isArray(payload?.system_prompt) && payload.system_prompt.length) {
              config.systemPrompt = payload.system_prompt.join("\n");
            }
            if (Array.isArray(payload?.few_shot_examples)) {
              config.fewShotExamples = payload.few_shot_examples
                .filter((item) => item && item.user && item.assistant)
                .map((item) => ({
                  user: item.user,
                  assistant: item.assistant
                }));
            }
            config.prompts.planner = normalizePromptSection(payload?.planner, defaultPrompts.planner);
            config.prompts.narrator = normalizePromptSection(payload?.narrator, defaultPrompts.narrator);

            const incomingSqlAgents = payload?.sql_agents && typeof payload.sql_agents === "object" ? payload.sql_agents : null;
            const nextSqlAgents = {
              [DEFAULT_SQL_AGENT_KEY]: normalizePromptSection(payload?.sql_agent, defaultSqlAgents.core),
              salInv: normalizePromptSection(incomingSqlAgents?.sal_inv ?? null, defaultSqlAgents.salInv)
            };

            if (incomingSqlAgents) {
              Object.keys(incomingSqlAgents).forEach((rawKey) => {
                const normalizedKey = toAgentKey(rawKey);
                if (!normalizedKey) return;
                const fallback = defaultSqlAgents[normalizedKey] || defaultSqlAgents.core;
                nextSqlAgents[normalizedKey] = normalizePromptSection(incomingSqlAgents[rawKey], fallback);
              });
            }

            config.sqlAgents = nextSqlAgents;
            config.loaded = true;
            config.debug = debug.enabled;
            setActiveSqlAgent(resolveWidgetSqlAgent() || state.sqlAgentKey, "config-load");
            debug.group("config:loaded", () => {
              debug.log("systemPrompt.length", config.systemPrompt.length);
              debug.log("fewShotExamples.count", config.fewShotExamples.length);
              debug.log("sqlAgents.keys", Object.keys(config.sqlAgents));
            });
          } catch (error) {
            console.warn(`[GPT5-mini#${instanceId}] chat_config load failed`, error);
            config.loaded = false;
            config.systemPrompt = defaultSystemPrompt;
            config.fewShotExamples = [];
            config.prompts.planner = normalizePromptSection(null, defaultPrompts.planner);
            config.prompts.narrator = normalizePromptSection(null, defaultPrompts.narrator);
            config.sqlAgents = {
              [DEFAULT_SQL_AGENT_KEY]: normalizePromptSection(null, defaultSqlAgents.core),
              salInv: normalizePromptSection(null, defaultSqlAgents.salInv)
            };
            setActiveSqlAgent(resolveWidgetSqlAgent() || state.sqlAgentKey, "config-load-error");
            debug.log("config:load-error", error.message);
          }
        }

        function bootstrapConversation() {
          state.messages = config.systemPrompt ? [{ role: "system", content: config.systemPrompt }] : [];
          state.conversation = [];
          if (config.fewShotExamples.length) {
            config.fewShotExamples.forEach((example) => {
              state.messages.push({ role: "user", content: example.user });
              state.messages.push({ role: "assistant", content: example.assistant });
            });
          }
          debug.log("conversation:bootstrapped", {
            systemPromptLength: config.systemPrompt.length,
            historyTurns: state.messages.length
          });
        }

        async function init() {
          await loadConfig();
          bootstrapConversation();
          guardApiKey();
          debug.log("app:init", {
            configLoaded: config.loaded,
            debug: debug.enabled,
            sqlAgent: state.sqlAgentKey
          });
        }

        init().catch((error) => {
          debug.log("app:init:error", error.message);
        });
      };

      const mountAll = () => {
        const containers = Array.from(document.querySelectorAll(".llm_chatbox"));
        if (!containers.length) return;
        containers.forEach((container) => {
          if (container.dataset.chatInitialized === "1") return;
          const widget = createWidgetShell(container);
          const instanceId = ++instanceCounter;
          initWidget(widget, container, instanceId);
        });
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mountAll);
      } else {
        mountAll();
      }
      
})();
