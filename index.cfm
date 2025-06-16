<!--- index.cfm --->
<!DOCTYPE html>
<html lang="en">
	<head>
		<title>Business Report AI Agent</title>
		<meta name="viewport" content="width=device-width,initial-scale=1">
		<meta charset="utf-8">
		<style>
			:root {
				--main-bg: #f6f7fb;
				--bubble-user: #2d69e0;
				--bubble-ai: #e4e9f4;
				--text-ai: #1a2343;
				--border: #e2e2e2;
				--shadow: 0 4px 24px #2d69e011;
			}
			html,body {
				height: 100%; margin:0; padding:0;
				background: var(--main-bg);
			}
			body {
				display: flex; align-items: center; justify-content: center;
				min-height: 100vh;
			}
			.chat-wrap {
				background: #fff;
				border-radius: 12px;
				box-shadow: var(--shadow);
				width: 100%;
				max-width: 95vw;
				display: flex;
				flex-direction: column;
				height: 95vh;
				min-height: 480px;
				overflow: hidden;
				position: relative;
			}
			.chat-header {
				padding: 18px 20px;
				border-bottom: 1px solid var(--border);
				background: #f7f9fb;
				font-size: 1.15rem;
				font-weight: 600;
				letter-spacing: .2px;
				position: relative;
			}
			.chatbox {
				flex:1;
				padding: 18px 12px;
				overflow-y: auto;
				display: flex;
				flex-direction: column;
				gap: 12px;
				background: #fafdff;
			}
			.msg-row {
				display: flex;
				gap: 7px;
				align-items: flex-end;
			}
			.msg-bubble {
				max-width: 85%;
				padding: 10px 15px;
				border-radius: 14px 14px 14px 4px;
				font-size: 1rem;
				line-height: 1.55;
				box-shadow: 0 2px 7px #0001;
				word-break: break-word;
			}
			.msg-user {
				margin-left: auto;
				background: var(--bubble-user);
				color: #fff;
				border-radius: 14px 14px 4px 14px;
			}
			.msg-ai {
				background: var(--bubble-ai);
				color: var(--text-ai);
			}
			.sql-debug {
				font-family: "JetBrains Mono",monospace,monospace;
				font-size: .92rem; color: #5a6382; background: #eef2fa;
				border-radius: 5px; padding: 6px 10px; margin: 7px 0 0;
				white-space: pre-line;
			}
			.chat-form {
				display: flex;
				border-top: 1px solid var(--border);
				padding: 12px 10px 12px 14px;
				background: #fff;
				gap: 8px;
			}
			.chat-form input {
				border: 1px solid #ccd6e4;
				border-radius: 7px;
				padding: 9px 12px;
				font-size: 1.03rem;
				flex: 1;
				background: #fafcff;
				outline: none;
			}
			.chat-form button {
				background: var(--bubble-user);
				color: #fff;
				border: none;
				border-radius: 7px;
				padding: 0 20px;
				font-size: 1.05rem;
				cursor: pointer;
				transition: background .16s;
			}
			.chat-form button:active { background: #1b3977; }
			table.biz-table {
				width: 100%;
				border-collapse: separate;
				border-spacing: 0;
				background: #fff;
				font-size: 14px;
				border-radius: 16px;
				box-shadow: 0 2px 12px rgba(0,0,0,0.06);
				overflow: hidden;
			}
			
			table.biz-table th, table.biz-table td {
				padding: 12px 18px;
				text-align: left;
				border-bottom: 1px solid #f0f0f0;
				white-space: nowrap;
			}
			
			table.biz-table th {
				background: #f9fafb;
				font-weight: bold;
				color: #323232;
				letter-spacing: 1px;
				position: sticky;
				top: 0;
			}
			
			table.biz-table tr:hover td {
				background: #f6f8fa;
				transition: background 0.2s;
			}
			
			table.biz-table tr:last-child td {
				border-bottom: none;
			}
			
			/* Optional: zebra stripes for rows */
                        table.biz-table tr:nth-child(even) td {
                                background: #fcfcfc;
                        }
                        table.biz-table th.sortable {
                                cursor: pointer;
                        }
                        table.biz-table th.sortable[data-order="asc"]::after {
                                content: " \25B2";
                                font-size: .75em;
                        }
                        table.biz-table th.sortable[data-order="desc"]::after {
                                content: " \25BC";
                                font-size: .75em;
                        }
			.loading {
				opacity: .7;
				font-style: italic;
			}
			.clear-btn {
				position: absolute; right: 16px; top: 13px;
				font-size:.92rem; padding:4px 10px;
				border-radius:7px;background:#f4f5fc;
				border:1px solid #e0e1e8;cursor:pointer;
				color:#456;
			}
			#showDebugBtn {
				position: absolute; right: 118px; top: 13px; z-index:10;
				font-size:.95rem;padding:5px 15px;border-radius:7px;
				background:#f4f5fc;border:1px solid #e0e1e8;cursor:pointer;color:#456;
			}
			#debugWrap {
				position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:1000;
				background:#111c;
				padding:0 8px;
			}
			#debugWrap .modal-box {
				max-width:540px;
				margin:44px auto;
				background:#fff;
				border-radius:8px;
				padding:18px 16px;
				box-shadow:0 6px 36px #2223;
			}
			#debugWrap .modal-head {
				display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;
			}
			#debugContent {
				font-size:.97rem;max-height:65vh;overflow:auto;color:#223;white-space:pre-wrap;
			}
			@media (max-width:480px) {
				.chat-wrap { height: 98vh; min-height: 0; border-radius: 0; }
				.chat-header { font-size: 1.06rem; padding: 15px 10px;}
				.chatbox { padding: 10px 5px;}
				.clear-btn { top:8px; right: 10px; }
				#showDebugBtn { bottom: 56px; right:10px; }
				#debugWrap .modal-box { margin: 24px auto;}
			}
		</style>
	</head>
	<body>
		<div class="chat-wrap">
			<div class="chat-header">
				Business Report AI Agent
				<button class="clear-btn" id="clearChat" type="button">Clear Chat</button>
				<!-- Debug trigger button -->
				<button id="showDebugBtn" type="button">Show Debug Log</button>
			</div>
			<div class="chatbox" id="chatbox">
				<!-- Conversation goes here -->
			</div>
			<form class="chat-form" id="qform" autocomplete="off">
				<input name="msg" id="msg" autocomplete="off" placeholder="Ask business, data or SQL questions..." required>
				<button type="submit">Send</button>
			</form>
			<!-- Debug log modal -->
			<div id="debugWrap" style="display:none;">
				<div class="modal-box">
					<div class="modal-head">
						<b>Debug Log</b>
						<button id="closeDebug" style="font-size:.98rem;padding:3px 13px;border-radius:6px;border:1px solid #eee;cursor:pointer;">Close</button>
					</div>
					<pre id="debugContent"></pre>
				</div>
			</div>
			
		</div>
		<script>
			window.addEventListener('load', function() {
				// ---- IndexedDB logic ----
				const DB_NAME = 'bizAgentChatDB', STORE = 'chat';
				let db;
				
				function openDB() {
					return new Promise((resolve, reject) => {
						const req = indexedDB.open(DB_NAME, 1);
						req.onupgradeneeded = e => {
							const db = e.target.result;
							if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, {keyPath:'id', autoIncrement:true});
						};
						req.onsuccess = e => { db = e.target.result; resolve(db); };
						req.onerror = e => reject(e);
					});
				}
				function saveTurn(user, ai) {
					return openDB().then(db => {
						return new Promise((resolve, reject) => {
							const tx = db.transaction([STORE], 'readwrite');
							tx.objectStore(STORE).add({user, ai, ts: Date.now()});
							tx.oncomplete = resolve; tx.onerror = reject;
						});
					});
				}
				function loadHistory() {
					return openDB().then(db => {
						return new Promise((resolve, reject) => {
							const tx = db.transaction([STORE], 'readonly');
							const store = tx.objectStore(STORE);
							const req = store.getAll();
							req.onsuccess = () => {
								resolve(req.result.sort((a,b)=>a.ts-b.ts));
							};
							req.onerror = reject;
						});
					});
				}
				function clearHistory() {
					return openDB().then(db => {
						return new Promise((resolve, reject) => {
							const tx = db.transaction([STORE], 'readwrite');
							tx.objectStore(STORE).clear();
							tx.oncomplete = resolve; tx.onerror = reject;
						});
					});
				}
				
				// ---- Chat UI logic ----
				const $form = document.getElementById('qform');
				const $msg = document.getElementById('msg');
				const $chatbox = document.getElementById('chatbox');
				const $clearBtn = document.getElementById('clearChat');
				const $showDebugBtn = document.getElementById('showDebugBtn');
				const $debugWrap = document.getElementById('debugWrap');
				const $closeDebug = document.getElementById('closeDebug');
				const $debugContent = document.getElementById('debugContent');
				
				let chatHistory = [];
				let lastDebug = { LOG:[], PLAN:[], DEBUG:{}, AGENTS:{} };
				
				// Render a chat bubble (ai/user)
				function addMsg(content, type = 'ai', options = {}) {
					const row = document.createElement('div');
					row.className = 'msg-row';
					const bubble = document.createElement('div');
					bubble.className = 'msg-bubble msg-' + type;
					bubble.innerHTML = content;
					row.appendChild(bubble);
					$chatbox.appendChild(row);
					$chatbox.scrollTop = $chatbox.scrollHeight;
					return bubble;
				}
				
				function showLoading() {
					return addMsg('Thinking...', 'ai', {loading:true}).classList.add('loading');
				}
				
				// Load & display chat history
				loadHistory().then(history => {
					chatHistory = history.map(turn => ({user: turn.user, ai: turn.ai}));
					history.forEach(turn => {
						if (turn.user) addMsg(turn.user, 'user');
						if (turn.ai) addMsg(turn.ai, 'ai');
					});
					$chatbox.scrollTop = $chatbox.scrollHeight;
				});
				
				$form.onsubmit = async (e) => {
					e.preventDefault();
					const userMsg = $msg.value.trim();
					if(!userMsg) return;
					addMsg(userMsg, 'user');
					$msg.value = '';
					showLoading();
					$form.querySelector('button').disabled = true;
					
					// Gather recent chat history for context (last 10)
					let recentHistory = [];
					try {
						const fullHistory = await loadHistory();
						recentHistory = fullHistory.slice(-10).map(turn => ({user: turn.user, ai: turn.ai}));
					} catch {}
					
					try {
						const fd = new FormData();
						fd.append('msg', userMsg);
						fd.append('chatHistory', JSON.stringify(recentHistory));
						const r = await fetch('ai_agent.cfm', {method:"POST", body:fd});
						const j = await r.json();
						// Remove loading
						const loading = $chatbox.querySelector('.loading');
						if (loading) loading.parentNode.remove();
						
						let msg = '';
						if(j.error){
							msg = "<b>❌ Error:</b> " + j.error + (j.details? "<br>"+j.details : "");
							addMsg(msg, 'ai');
							$form.querySelector('button').disabled = false;
							await saveTurn(userMsg, msg);
							lastDebug = { LOG:['Error: '+(j.details||j.error)], PLAN:j.PLAN||[], DEBUG:j.DEBUG||{}, AGENTS:j.AGENTS||{} };
							return;
						}
						if(j.SUMMARY) msg += `<b>${j.SUMMARY}</b><br>`;
						if(j.SQL) msg += `<div class="sql-debug">SQL: ${j.SQL}</div>`;
						if(j.TABLE) msg += j.TABLE;
						addMsg(msg, 'ai');
						await saveTurn(userMsg, msg);
						lastDebug = { LOG: j.LOG || [], PLAN: j.PLAN || [], DEBUG: j.DEBUG || {}, AGENTS:j.AGENTS||{} };
					} catch(ex){
						const loading = $chatbox.querySelector('.loading');
						if (loading) loading.parentNode.remove();
						addMsg("<b>Unexpected error:</b> " + ex, 'ai');
						await saveTurn(userMsg, "<b>Unexpected error:</b> " + ex);
						lastDebug = { LOG:['Fetch error: ' + ex], PLAN:[], DEBUG:{}, AGENTS:{} };
					}
					$form.querySelector('button').disabled = false;
				};
				
				$clearBtn.onclick = async () => {
					await clearHistory();
					$chatbox.innerHTML = '';
					chatHistory = [];
					$msg.focus();
				};
				
				// Show debug log UI
				$showDebugBtn.onclick = () => {
					let msg = '';
					if (lastDebug.PLAN) msg += "PLAN:\n" + JSON.stringify(lastDebug.PLAN, null, 2) + "\n\n";
					if (lastDebug.LOG && lastDebug.LOG.length) msg += "LOG:\n" + lastDebug.LOG.join('\n') + "\n\n";
					if (lastDebug.DEBUG && Object.keys(lastDebug.DEBUG).length)
					msg += "DEBUG:\n" + JSON.stringify(lastDebug.DEBUG, null, 2) + "\n";
					
					if (lastDebug.AGENTS) msg += "AGENTS:\n" + JSON.stringify(lastDebug.AGENTS, null, 2) + "\n\n";
					
					$debugContent.textContent = msg || "(No debug info)";
					$debugWrap.style.display = '';
					document.body.style.overflow = 'hidden';
				};
				$closeDebug.onclick = () => {
					$debugWrap.style.display = 'none';
					document.body.style.overflow = '';
				};
				
				// Autofocus and scroll to bottom on mobile
				setTimeout(()=>{ $msg.focus(); $chatbox.scrollTop = $chatbox.scrollHeight; }, 120);
			});
			
			function autoSumTable() {
				// Keywords to match column headers (customize as needed)
				const amountHeaders = [
					'amount', 'total', 'sales', 'price', 'sum', 'qty', 'quantity', 'balance', 'cost'
				];
				
				document.querySelectorAll('.biz-table').forEach(table => {
					if (table.dataset.summed) return;
					
					const rows = table.querySelectorAll('tr');
					if (rows.length < 2) return; // Not enough data
					
					// Get header names
					const headers = Array.from(rows[0].querySelectorAll('th')).map(th => th.textContent.trim().toLowerCase());
					const sumIndexes = [];
					headers.forEach((h, i) => {
						if (amountHeaders.some(k => h.includes(k))) sumIndexes.push(i);
					});
					if (!sumIndexes.length) return; // No numeric columns
					
					// Init sums
					const sums = Array(headers.length).fill(null);
					sumIndexes.forEach(i => sums[i] = 0);
					
					// Calculate sums
					for (let r = 1; r < rows.length; r++) {
						const cells = rows[r].querySelectorAll('td');
						sumIndexes.forEach(i => {
							if (cells[i]) {
								let val = cells[i].textContent.replace(/[^0-9.\-]/g, '');
								let num = parseFloat(val);
								if (!isNaN(num)) sums[i] += num;
							}
						});
					}
					
					// If ALL sums are zero, don't show the total row at all
					const hasNonzeroSum = sumIndexes.some(i => Math.abs(sums[i]) > 0.0001);
					if (!hasNonzeroSum) return;
					
					// Build the sum row
					const sumRow = document.createElement('tr');
					for (let i = 0; i < headers.length; i++) {
						const td = document.createElement('td');
						if (sums[i] !== null && Math.abs(sums[i]) > 0.0001) {
							td.innerHTML = `<b>Total: ${sums[i].toLocaleString(undefined, {maximumFractionDigits:2})}</b>`;
							td.style.color = "#11974e";
						} else {
							td.innerHTML = '';
						}
						sumRow.appendChild(td);
					}
					sumRow.style.background = '#eaf7ed';
					sumRow.style.fontWeight = 'bold';
                                table.appendChild(sumRow);
                                table.dataset.summed = '1';
                        });
                    }

                    function sortTable(table, idx, asc) {
                            const rows = Array.from(table.querySelectorAll('tr'));
                            const header = rows.shift();
                            let sumRow = null;
                            if (table.dataset.summed) sumRow = rows.pop();

                            rows.sort((a,b) => {
                                    const aText = a.cells[idx]?.textContent.trim() || '';
                                    const bText = b.cells[idx]?.textContent.trim() || '';
                                    const aNum = parseFloat(aText.replace(/[^0-9.\-]/g, ''));
                                    const bNum = parseFloat(bText.replace(/[^0-9.\-]/g, ''));
                                    if (!isNaN(aNum) && !isNaN(bNum)) return asc ? aNum - bNum : bNum - aNum;
                                    return asc ? aText.localeCompare(bText) : bText.localeCompare(aText);
                            });

                            table.innerHTML = '';
                            table.appendChild(header);
                            rows.forEach(r => table.appendChild(r));
                            if (sumRow) table.appendChild(sumRow);

                            header.querySelectorAll('th').forEach(th => th.removeAttribute('data-order'));
                            header.children[idx].dataset.order = asc ? 'asc' : 'desc';
                    }

                    function makeTablesSortable() {
                            document.querySelectorAll('.biz-table').forEach(table => {
                                    if (table.dataset.sortable) return;
                                    const header = table.querySelector('tr');
                                    if (!header) return;
                                    header.querySelectorAll('th').forEach((th,i) => {
                                            th.classList.add('sortable');
                                            th.addEventListener('click', () => {
                                                    const asc = th.dataset.order !== 'asc';
                                                    sortTable(table, i, asc);
                                            });
                                    });
                                    table.dataset.sortable = '1';
                            });
                    }
			
			// Watch for tables being added (new answers)
                        const observer = new MutationObserver(() => {
                                autoSumTable();
                                makeTablesSortable();
                        });
			observer.observe(document.getElementById('chatbox'), { childList: true, subtree: true });
			
			// Run on initial load
                        window.addEventListener('DOMContentLoaded', () => {
                                autoSumTable();
                                makeTablesSortable();
                        });
                        window.addEventListener('load', () => {
                                autoSumTable();
                                makeTablesSortable();
                        });
			
			
		</script>
		
		
	</body>
</html>
