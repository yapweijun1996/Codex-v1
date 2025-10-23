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
				width: 100%;
				max-width: 95vw;
				display: flex;
				flex-direction: column;
				height: 95vh;
				min-height: 480px;
				overflow: hidden;
				position: relative;
				box-shadow:
				0 1.5px 6px 0 rgba(60, 80, 180, 0.08),
				0 4px 24px 0 rgba(60, 80, 180, 0.15);
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
			.loader-bar {
				width: 100%;
				height: 4px;
				background: #2d69e0;
				overflow: hidden;
				border-radius: 2px;
				box-shadow: 0 0 8px #2d69e0cc;
				/* no absolute positioning, no top/left */
				margin: 0;
				flex-shrink: 0;
				animation: none; /* disable animation on main bar */
				position: relative; /* to position pseudo-element */
				z-index: 9999;
			}
			
			.loader-bar::before {
				content: "";
				position: absolute;
				left: -40%;
				top: 0;
				height: 100%;
				width: 40%;
				background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
				animation: loaderWave 1.5s infinite;
				border-radius: 2px;
				will-change: left;
			}
			
			@keyframes loaderWave {
				0% {
					left: -40%;
				}
				100% {
					left: 100%;
				}
			}
			.header-title {
				flex: 1 1 100%;
				font-weight: 600;
				font-size: 1.1rem;
				margin-bottom: 6px;
				white-space: normal;
			}
			@media (max-width:480px) {
				.chat-wrap { height: 98vh; min-height: 0; border-radius: 0; }
				.chatbox { padding: 10px 5px;}
				#showDebugBtn { bottom: 56px; right:10px; }
				#debugWrap .modal-box { margin: 24px auto;}
				
				.chat-header {
					display: flex;
					flex-wrap: wrap;
					align-items: center;
					gap: 8px;
					font-size: 1rem;
					padding: 12px 10px;
					justify-content: space-between;
				}
				
				.chat-header > * {
					flex-shrink: 0;
				}
				
				/* Buttons stack under text if needed */
				.clear-btn,
				#showDebugBtn {
					flex: 1 1 48%;
					min-width: 77px;
					box-sizing: border-box;
					font-size: 12px;
					padding: 6px 6px;
					top: 0px;
					position: relative;
					float: right;
				}
				
				#showDebugBtn{
					display:none;
				}
				
				.header-title {
					font-weight: 600;
					font-size: 16px;
					margin: 0px;
				}
			}
			
		</style>
		<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
	</head>
	<body>
		<div class="chat-wrap">
			<div class="chat-header">
				<table cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;" border="0">
					<tr>
						<td style="box-sizing:border-box; width:222px;"></td>
						<td style="box-sizing:border-box; width:auto;"></td>
					</tr>
					<tr>
						<td style="box-sizing:border-box;">
							<div class="header-title">Business Report AI Agent</div>
						</td>
						<td style="box-sizing:border-box;">
							<button class="clear-btn" id="clearChat" type="button">Clear Chat</button>
							<button id="showDebugBtn" type="button">Show Debug Log</button>
						</td>
					</tr>
				</table>
			</div>
			<div class="loader-bar" id="loaderBar" style="display:none;"></div>
			<div class="chatbox" id="chatbox">
				<!-- Conversation goes here -->
			</div>
			
			<form class="chat-form" id="qform" autocomplete="off">
				<input list="questions" name="msg" id="msg" autocomplete="off" placeholder="Ask business, data or SQL questions..." required>
				<datalist id="questions">
					<option value="Analyze the sales trend over the past 13 months. Provide insights on monthly sales performance, identify any significant patterns or anomalies, and suggest potential reasons for fluctuations."></option>
					<option value="List the top-performing products by sales in the last 12 months. Highlight key contributors, sales volumes, and any notable changes or trends in product performance."></option>
					<option value="Provide a year-over-year (YoY) sales comparison. Highlight growth rates, key drivers behind changes, and any significant trends or anomalies between the current and previous year."></option>
					<option value="List the top sales(SGD) by each salesperson. Include total sales amounts, rankings, and highlight outstanding performances."></option>
					<option value="Identify the top customers by sales over the last 12 months. Provide sales totals, ranking, and highlight any notable changes or trends in customer purchasing behavior."></option>
					
				</datalist>
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
				function saveTurn(user, ai, chart = null) {
					return openDB().then(db => {
						return new Promise((resolve, reject) => {
							const tx = db.transaction([STORE], 'readwrite');
							tx.objectStore(STORE).add({user, ai, chart, ts: Date.now()});
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
				const loaderBar = document.getElementById('loaderBar');
				
				let chatHistory = [];
				let lastDebug = { LOG:[], PLAN:[], DEBUG:{}, AGENTS:{} };
				
				// Render a chat bubble (ai/user)
				function addMsg(content, type = 'ai', options = {}) {
					console.log("addMsg");
					const row = document.createElement('div');
					row.className = 'msg-row';
					const bubble = document.createElement('div');
					bubble.className = 'msg-bubble msg-' + type;
					bubble.innerHTML = content;
					
					// If chart data is an array (multiple charts), render each one
					if (options.chart) {
						// Remove existing canvas children if any (optional)
						// Then render all charts in options.chart array or single object
						let chartsToRender = Array.isArray(options.chart) ? options.chart : [options.chart];
						
						chartsToRender.forEach(chartConfig => {
							if (chartConfig && chartConfig.type && chartConfig.labels && chartConfig.datasets) {
								const canvas = document.createElement('canvas');
								canvas.style.maxWidth = '800px';
								canvas.style.maxHeight = '600px';
								canvas.style.background = '#fff';
								canvas.style.margin = '10px 0';
								canvas.style.borderRadius = '10px';
								canvas.style.padding = '15px';
								
								bubble.appendChild(canvas);
								
								setTimeout(() => {
									try {
										const chart = new Chart(canvas.getContext('2d'), {
											type: chartConfig.type,
											data: {
												labels: chartConfig.labels,
												datasets: chartConfig.datasets
											},
											options: chartConfig.options || {
												responsive: true,
												plugins: {
													legend: { display: true, position: 'top' },
													title: { display: !!(chartConfig.title), text: chartConfig.title || '' }
												}
											}
										});
										canvas.chartInstance = chart;
										bubble.chartInstance = chart;
									} catch (e) {
										console.warn('Chart rendering failed:', e, chartConfig);
									}
								}, 100);
								
							} else {
								console.warn('Chart config missing required fields:', chartConfig);
							}
						});
					}
					
					const openBtn = document.createElement('button');
					openBtn.innerText = '↗️';
					openBtn.title = 'Open in new tab';
					openBtn.style.cssText = 'border:none;background:transparent;cursor:pointer;margin-left:5px;font-size:1.08em;';
					openBtn.onclick = (e) => {
						e.stopPropagation();
						console.log(content);
						console.log(options.chart);
						openBubbleInNewTabIndexedDB(content, options.chart);
					};
					bubble.appendChild(openBtn);
					
					row.appendChild(bubble);
					$chatbox.appendChild(row);
					$chatbox.scrollTop = $chatbox.scrollHeight;
					return bubble;
				}
				
				function removeFunctions(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(removeFunctions);

  const cleanObj = {};
  for (const key in obj) {
    if (typeof obj[key] !== 'function') {
      cleanObj[key] = removeFunctions(obj[key]);
    }
  }
  return cleanObj;
}

				function openBubbleInNewTabIndexedDB(content, chartConfig) {
  // Clean the chartConfig of functions before storing
  const safeChartConfig = removeFunctions(chartConfig);

  const id = 'bubble_' + Math.random().toString(36).substr(2, 9);
  const request = indexedDB.open('BubbleTabDB', 1);
  request.onupgradeneeded = function(e) {
    e.target.result.createObjectStore('bubbles', { keyPath: 'id' });
  };
  request.onsuccess = function(e) {
    const db = e.target.result;
    const tx = db.transaction('bubbles', 'readwrite');
    tx.objectStore('bubbles').put({ id, content, chartConfig: safeChartConfig });
    tx.oncomplete = function() {
      window.open(window.location.pathname + '?bubble=' + id, '_blank');
    };
  };
  request.onerror = function(e) {
    alert('IndexedDB error: ' + e.target.error);
  };
}
				
				
				
				
				
				
				
				
				
				
				function showLoading() {
					return addMsg('Thinking...', 'ai', {loading:true}).classList.add('loading');
				}
				
				function destroyAllCharts() {
					document.querySelectorAll('canvas').forEach(c => {
						if (c.chartInstance) {
							c.chartInstance.destroy();
							c.chartInstance = null;
						}
					});
				}
				
				// Load & display chat history and render any saved charts
				loadHistory().then(history => {
					chatHistory = history.map(turn => ({user: turn.user, ai: turn.ai, chart: turn.chart}));
					history.forEach(turn => {
						if (turn.user) addMsg(turn.user, 'user');
						if (turn.ai) addMsg(turn.ai, 'ai', {chart: turn.chart});
					});
					$chatbox.scrollTop = $chatbox.scrollHeight;
					autoSumTable();
					makeTablesSortable();
				});
				
				$form.onsubmit = async (e) => {
					e.preventDefault();
					const userMsg = $msg.value.trim();
					if(!userMsg) return;
					addMsg(userMsg, 'user');
					$msg.value = '';
					
					// Show loader bar
					loaderBar.style.display = 'block';
					
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
						let debug_yn = 'n';
						if(j.error){
							msg = "<b>❌ Error:</b> " + j.error + (j.details? "<br>"+j.details : "");
							addMsg(msg, 'ai');
							$form.querySelector('button').disabled = false;
							await saveTurn(userMsg, msg, j.CHART);
							lastDebug = { LOG:['Error: '+(j.details||j.error)], PLAN:j.PLAN||[], DEBUG:j.DEBUG||{}, AGENTS:j.AGENTS||{} };
							return;
						}
						if(j.SUMMARY) msg += `<div class="summary"><b>${j.SUMMARY}</b></div>`;
						if(debug_yn == 'y' && j.SQL) msg += `<div class="sql-debug">SQL: ${j.SQL}</div>`;
						if(debug_yn == 'y' && j.LOG && j.LOG.length){
							msg += `<div class="debug_log" style="font-family: monospace; white-space: break-spaces; border-radius: 15px; margin: 10px 0px; padding: 10px; background: azure; font-size: 0.8rem; color:#888;">Debug Log:\n${j.LOG.join('\n')}</div>`;
						}
						if(j.TABLE) msg += j.TABLE;
						
						if (Array.isArray(j.CHART)) {
							addMsg(msg, 'ai', { chart: j.CHART });
						} else if (j.CHART && j.CHART.type) {
							addMsg(msg, 'ai', { chart: j.CHART });
						} else {
							addMsg(msg, 'ai');
						}
						
						await saveTurn(userMsg, msg, j.CHART);
						lastDebug = { LOG: j.LOG || [], PLAN: j.PLAN || [], DEBUG: j.DEBUG || {}, AGENTS:j.AGENTS||{} };
					} catch(ex){
						const loading = $chatbox.querySelector('.loading');
						if (loading) loading.parentNode.remove();
						addMsg("<b>Unexpected error:</b> " + ex, 'ai');
						await saveTurn(userMsg, "<b>Unexpected error:</b> " + ex, null);
						lastDebug = { LOG:['Fetch error: ' + ex], PLAN:[], DEBUG:{}, AGENTS:{} };
					}
					
					// Hide loader bar after response/error
					loaderBar.style.display = 'none';
					$form.querySelector('button').disabled = false;
				};
				
				$clearBtn.onclick = async () => {
					await clearHistory();
					destroyAllCharts();
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
				document.querySelectorAll('.biz-table').forEach(table => {
					if (table.dataset.summed) return;
					
					// Find header row
					const headerRow = table.querySelector('tr');
					if (!headerRow) return;
					const headers = Array.from(headerRow.querySelectorAll('th'));
					if (!headers.length) return;
					
					// Data rows (skip header)
					const dataRows = Array.from(table.querySelectorAll('tr')).slice(1);
					if (!dataRows.length) return;
					
					const colCount = headers.length;
					const isNumericCol = Array(colCount).fill(true);
					
					// Step 1: Detect which columns are numeric in ALL rows
					for (let col = 0; col < colCount; col++) {
						for (let r = 0; r < dataRows.length; r++) {
							const cell = dataRows[r].querySelectorAll('td')[col];
							if (!cell) { isNumericCol[col] = false; break; }
							let val = cell.textContent.trim();
							// Empty = not numeric, NaN = not numeric
							if (val === '' || isNaN(Number(val))) {
								isNumericCol[col] = false;
								break;
							}
						}
					}
					
					// Step 2: Sum only fully numeric columns
					const sums = Array(colCount).fill(null);
					for (let col = 0; col < colCount; col++) {
						if (isNumericCol[col]) {
							sums[col] = 0;
							for (let r = 0; r < dataRows.length; r++) {
								const cell = dataRows[r].querySelectorAll('td')[col];
								sums[col] += Number(cell.textContent.trim());
							}
						}
					}
					
					// If all sums are null or zero, skip
					if (!sums.some(s => s !== null && Math.abs(s) > 0.0001)) return;
					
					// Build sum row
					const sumRow = document.createElement('tr');
					for (let i = 0; i < colCount; i++) {
						const td = document.createElement('td');
						if (sums[i] !== null && Math.abs(sums[i]) > 0.0001) {
							td.innerHTML = `<b>Total: ${sums[i].toLocaleString(undefined, {maximumFractionDigits:2})}</b>`;
							td.style.color = "#11974e";
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
			
			
			// Open in New Tab Logic [start]
			(function(){
				// 1. Check if there is a bubble=KEY in the query string
				const params = new URLSearchParams(window.location.search);
				const id = params.get('bubble');
				if (!id) return; // Nothing to do
				
				// 2. Get the data from IndexedDB
				const request = indexedDB.open('BubbleTabDB', 1);
				request.onsuccess = function(e) {
					const db = e.target.result;
					const tx = db.transaction('bubbles', 'readonly');
					const store = tx.objectStore('bubbles');
					const getReq = store.get(id);
					getReq.onsuccess = function() {
						const data = getReq.result;
						if (!data) {
							document.body.innerHTML = "<h2>No data found for this bubble.</h2>";
							return;
						}
						// 3. Render content and charts
						renderBubble(data.content, data.chartConfig);
					};
					getReq.onerror = function() {
						document.body.innerHTML = "<h2>Error loading data.</h2>";
					};
				};
				request.onerror = function(e) {
					document.body.innerHTML = "<h2>IndexedDB error: "+e.target.error+"</h2>";
				};
				
				// 4. Render function for text and charts
				function renderBubble(content, chartConfig) {
					document.body.innerHTML = `
					<div class="a4-paper">
						<div class="bubble">${content}</div>
						<div id="chartWrap"></div>
					</div>
					<div style="position:fixed; top:18px; right:38px; z-index:99; display:flex; gap:10px;">
						<button class="saveHtmlBtn-btn" id="saveHtmlBtn" style="print-color-adjust:exact;">💾 Save as .html</button>
						<button onclick="window.print()" class="print-btn" style="print-color-adjust:exact;">🖨️ Print</button>
					</div>
					`;
					var chartWrap = document.getElementById('chartWrap');
					// Minimal style for A4 and print
					var style = document.createElement('style');
					style.textContent = `
					body {
						display: block !important;
						align-items: normal !important;
						justify-content: flex-start !important;
						background: #f6f7fb;
						margin: 0;
						padding: 0;
					}
					.a4-paper {
						background: #fff;
						margin: 0;
						box-shadow: 0 2px 24px #2222;
						width: 730px;
						min-height: 297mm;
						border-radius: 12px;
						padding: 5px;
						position: relative;
						font-size: 1.08rem;
						color: #1a2343;
						display: flex;
						flex-direction: column;
						box-sizing: border-box;
					}
					.bubble {
						background: none;
						box-shadow: none;
						padding: 0;
						margin-bottom: 22px;
						font-size: 1.09rem;
					}
					.summary{padding-bottom: 15px;}
					.chart-title {margin-top:30px;font-size:1.12em;font-weight:bold;}
					.sql-debug{display:none;}
					.debug_log{display:none;}
					.chart-block {
						break-inside: avoid;
						page-break-inside: avoid;
					}
					@media (max-width: 900px) {
						.a4-paper { width: 98vw; min-height: 90vh; padding: 9px;}
					}
					@media print {
						html, body { background: none !important; margin: 0 !important; padding: 0 !important; }
						.a4-paper {
							box-shadow: none !important;
							margin: 0 !important;
							width: 210mm !important;
							min-height: 297mm !important;
							max-width: 730px !important;
							max-height: none !important;
							padding: 0px !important;
							page-break-after: always;
						}
						.saveHtmlBtn-btn { display: none !important; }
						.print-btn { display: none !important; }
						.chart-title { break-after: avoid; }
						.chart-block {
							break-inside: avoid !important;
							page-break-inside: avoid !important;
						}
					}
					@page {
						size: A4;
						margin: 0;
					}
					`;
					document.head.appendChild(style);
					
					// Load Chart.js dynamically if not present
					function ensureChartJs(callback) {
						if (window.Chart) return callback();
						var s = document.createElement('script');
						s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
						s.onload = callback;
						document.head.appendChild(s);
					}
					ensureChartJs(function() {
						function renderChart(c) {
							// Create container div for the chart block
							var chartDiv = document.createElement("div");
							chartDiv.className = "chart-block";
							chartDiv.style.width = "100%";
							chartDiv.style.maxWidth = "100%";
							chartDiv.style.boxSizing = "border-box";
							chartDiv.style.margin = "20px 0";
							chartDiv.style.background = "#fff";
							chartDiv.style.borderRadius = "10px";
							chartDiv.style.boxShadow = "0 1px 6px #0001";
							chartDiv.style.padding = "14px";
							chartDiv.style.display = "flex";
							chartDiv.style.flexDirection = "column";
							chartDiv.style.alignItems = "flex-start";
							// Critical: Add these for extra browser coverage
							chartDiv.style.breakInside = "avoid";
							chartDiv.style.pageBreakInside = "avoid";
							
							// Add title
							if (c.title) {
								var title = document.createElement("div");
								title.className = "chart-title";
								title.innerText = c.title;
								title.style.fontWeight = "bold";
								title.style.fontSize = "1.12em";
								title.style.marginBottom = "8px";
								chartDiv.appendChild(title);
							}
							// Add canvas
							var canvas = document.createElement("canvas");
							canvas.width = 600; canvas.height = 280;
							canvas.style.display = "block";
							canvas.style.marginBottom = "0";
							chartDiv.appendChild(canvas);
							
							// Append the whole chartDiv to #chartWrap
							chartWrap.appendChild(chartDiv);
							
							// Render Chart.js chart
							try {
								new Chart(canvas.getContext("2d"), {
									type: c.type,
									data: { labels: c.labels, datasets: c.datasets },
									options: c.options || {}
								});
							} catch(e) {
								chartDiv.innerHTML += "<b style='color:red'>Chart failed to render: "+e+"</b>";
							}
						}
						
						if (Array.isArray(chartConfig)) {
							chartConfig.forEach(function(c){
								if (c && c.type && c.labels && c.datasets) renderChart(c);
							});
						} else if (chartConfig && chartConfig.type && chartConfig.labels && chartConfig.datasets) {
							renderChart(chartConfig);
						} else {
							//chartWrap.innerHTML = "No chart data.";
						}
					});
					
					document.getElementById('saveHtmlBtn').onclick = function() {
						const a4Paper = document.querySelector('.a4-paper').cloneNode(true);
						const chartWrap = a4Paper.querySelector('#chartWrap');
						if (chartWrap) chartWrap.innerHTML = ''; // clear existing canvases before saving
						
						// Add buttons container HTML (only print button here, save button not needed in saved file)
						const buttonsHTML = `
						<div style="position:fixed; top:18px; right:38px; z-index:99; display:flex; gap:10px;">
							<button onclick="window.print()" class="print-btn" style="print-color-adjust:exact;">🖨️ Print</button>
						</div>
						`;
						
						const fullContent = a4Paper.outerHTML + buttonsHTML;
						
						const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
						.map(node => node.outerHTML).join('\n');
						
						const chartConfigJSON = JSON.stringify(chartConfig || null);
						
						const html = `
						<!DOCTYPE html>
						<html lang="en">
							<head>
								<meta charset="UTF-8" />
								<meta name="viewport" content="width=device-width, initial-scale=1" />
								<title>Report Preview</title>
								${styles}
							</head>
							<body>
								${fullContent}
								
								<!--- ---><script id="chartConfigData" type="application/json">${chartConfigJSON}</scr` + `ipt>
								<!--- ---><script src="https://cdn.jsdelivr.net/npm/chart.js"></scr` + `ipt>
								<script>
									document.addEventListener('DOMContentLoaded', function() {
										const chartConfigScript = document.getElementById('chartConfigData');
										if (!chartConfigScript) return;
										const chartConfigs = JSON.parse(chartConfigScript.textContent);
										const chartWrap = document.getElementById('chartWrap');
										if (!chartWrap) return;
										
										function renderChart(c) {
											const chartDiv = document.createElement('div');
											chartDiv.className = 'chart-block';
											chartDiv.style.width = '100%';
											chartDiv.style.maxWidth = '100%';
											chartDiv.style.boxSizing = 'border-box';
											chartDiv.style.margin = '20px 0';
											chartDiv.style.background = '#fff';
											chartDiv.style.borderRadius = '10px';
											chartDiv.style.boxShadow = '0 1px 6px #0001';
											chartDiv.style.padding = '14px';
											chartDiv.style.display = 'flex';
											chartDiv.style.flexDirection = 'column';
											chartDiv.style.alignItems = 'flex-start';
											chartDiv.style.breakInside = 'avoid';
											chartDiv.style.pageBreakInside = 'avoid';
											
											if (c.title) {
												const title = document.createElement('div');
												title.className = 'chart-title';
												title.innerText = c.title;
												title.style.fontWeight = 'bold';
												title.style.fontSize = '1.12em';
												title.style.marginBottom = '8px';
												chartDiv.appendChild(title);
											}
											
											const canvas = document.createElement('canvas');
											canvas.width = 600;
											canvas.height = 280;
											canvas.style.display = 'block';
											canvas.style.marginBottom = '0';
											chartDiv.appendChild(canvas);
											
											chartWrap.appendChild(chartDiv);
											
											new Chart(canvas.getContext('2d'), {
												type: c.type,
												data: { labels: c.labels, datasets: c.datasets },
												options: c.options || {}
											});
										}
										
										if (Array.isArray(chartConfigs)) {
											chartConfigs.forEach(c => {
												if (c && c.type && c.labels && c.datasets) renderChart(c);
											});
										} else if (chartConfigs && chartConfigs.type && chartConfigs.labels && chartConfigs.datasets) {
											renderChart(chartConfigs);
										}
									});
								</scr` + `ipt>
								
							</body>
						</html>
						`;
						
						const blob = new Blob([html], {type: 'text/html'});
						const url = URL.createObjectURL(blob);
						const a = document.createElement('a');
						a.href = url;
						a.download = 'report-preview.html';
						document.body.appendChild(a);
						a.click();
						setTimeout(() => {
							document.body.removeChild(a);
							URL.revokeObjectURL(url);
						}, 100);
					};
					
					
					
					
				}
			})();
			// Open in New Tab Logic [end  ]
			
			
		</script>
		
		
	</body>
</html>
