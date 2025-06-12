<!DOCTYPE html>
<html>
<head>
    <title>Business Report AI Agent</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
        body {
            font-family: system-ui, Arial, sans-serif;
            background: #f4f6fa;
            margin: 0;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .main {
            background: #fff;
            box-shadow: 0 4px 18px #0002;
            border-radius: 10px;
            max-width: 600px;
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        h1 {
            font-size: 1.2rem;
            margin: 16px;
            letter-spacing: 1px;
        }
        .thread {
            flex: 1;
            overflow-y: auto;
            padding: 0 16px 16px;
        }
        .msg {
            max-width: 90%;
            margin-bottom: 12px;
            padding: 10px 14px;
            border-radius: 8px;
        }
        .msg.user {
            align-self: flex-end;
            background: #d5e8ff;
        }
        .msg.ai {
            align-self: flex-start;
            background: #fcfcfc;
        }
        form {
            display: flex;
            gap: 8px;
            padding: 16px;
            border-top: 1px solid #ddd;
            background: #fff;
        }
        input,
        button {
            font-size: 1rem;
            border-radius: 8px;
            border: 1px solid #bbb;
            padding: 8px 14px;
        }
        input {
            flex: 1;
        }
        button {
            background: #2d69e0;
            color: #fff;
            border: none;
            cursor: pointer;
        }
        button:active {
            background: #1b3977;
        }
        .biz-table {
            border-collapse: collapse;
            margin-top: 10px;
        }
        .biz-table th,
        .biz-table td {
            border: 1px solid #ddd;
            padding: 3px 4px;
            font-size: 12px;
        }
        .biz-table th {
            background: #f0f4ff;
        }
        .sql-debug {
            font-family: "JetBrains Mono", monospace;
            color: #888;
            font-size: 0.94rem;
            background: #f6f6fa;
            margin: 8px 0 0;
            padding: 7px 10px;
            border-radius: 4px;
        }
        .debug-box {
            font-family: "JetBrains Mono", monospace;
            margin-top: 20px;
            background: #eee;
            padding: 10px;
            border-radius: 6px;
            display: none;
        }
        .debug-box-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .debug-copy-btn {
            font-size: 0.8rem;
            padding: 4px 8px;
        }
    </style>
</head>
<body>
    <div class="main">
        <h1>Business Report AI Agent</h1>
        <div id="thread" class="thread"></div>
        <form id="qform" autocomplete="off">
            <input name="msg" id="msg" list="presetQueries" placeholder="Type a message" required>
            <datalist id="presetQueries">
                <option value="Show latest purchase order"></option>
                <option value="Show latest sales invoice"></option>
                <option value="Top 10 Client for Sales Invoice"></option>
                <option value="Top 10 Supplier for Purchase Order"></option>
            </datalist>
            <button type="submit">Send</button>
        </form>
        <div id="debugBox" class="debug-box">
            <div class="debug-box-header">
                <strong>Debug Log</strong>
                <button type="button" id="copyDebug" class="debug-copy-btn">Copy Log</button>
            </div>
            <pre id="debugContent"></pre>
        </div>
    </div>
    <script>
    const $form = document.getElementById('qform');
    const $msg = document.getElementById('msg');
    const $thread = document.getElementById('thread');
    const $debugBox = document.getElementById('debugBox');
    const $debugContent = document.getElementById('debugContent');
    const $copyDebug = document.getElementById('copyDebug');

    const debugLogs = [];
    ['log','warn','error'].forEach(fn => {
        const orig = console[fn];
        console[fn] = (...args) => {
            orig.apply(console, args);
            const msg = args.map(a => {
                if(typeof a === 'object'){
                    try { return JSON.stringify(a, null, 2); } catch(e){ return String(a); }
                }
                return String(a);
            }).join(' ');
            debugLogs.push(fn.toUpperCase()+': '+msg);
            $debugContent.textContent = debugLogs.join('\n');
            $debugBox.style.display = 'block';
        };
    });
    $copyDebug.onclick = () => navigator.clipboard.writeText($debugContent.textContent);
    $msg.addEventListener('focus', () => {
        $msg.dispatchEvent(new Event('input', {bubbles: true}));
    });
    $form.onsubmit = async (e) => {
        e.preventDefault();
        const text = $msg.value.trim();
        if (!text) return;

        const userEl = document.createElement('div');
        userEl.className = 'msg user';
        userEl.textContent = text;
        $thread.appendChild(userEl);

        $msg.value = '';
        $thread.scrollTop = $thread.scrollHeight;

        const aiEl = document.createElement('div');
        aiEl.className = 'msg ai';
        aiEl.textContent = '...';
        $thread.appendChild(aiEl);
        $thread.scrollTop = $thread.scrollHeight;

        const fd = new FormData();
        fd.append('msg', text);
        try {
            const r = await fetch('ai_agent.cfm', { method: 'POST', body: fd });
            const j = await r.json();
            console.log(j);
            if (j.error) {
                aiEl.textContent = '';
                const errLabel = document.createElement('b');
                errLabel.textContent = '❌ Error:';
                aiEl.appendChild(errLabel);
                aiEl.appendChild(document.createTextNode(' ' + j.error));
                if (j.details) {
                    aiEl.appendChild(document.createElement('br'));
                    aiEl.appendChild(document.createTextNode(j.details));
                }
                return;
            }

            if (Array.isArray(j.history)) {
                $thread.innerHTML = '';
                j.history.forEach(item => {
                    const ue = document.createElement('div');
                    ue.className = 'msg user';
                    ue.textContent = item.user;
                    $thread.appendChild(ue);

                    const ae = document.createElement('div');
                    ae.className = 'msg ai';

                    const summaryDiv = document.createElement('div');
                    const summaryB = document.createElement('b');
                    summaryB.textContent = item.summary || '';
                    summaryDiv.appendChild(summaryB);
                    ae.appendChild(summaryDiv);

                    if (item.sql) {
                        const sqlDiv = document.createElement('div');
                        sqlDiv.className = 'sql-debug';
                        sqlDiv.textContent = 'SQL: ' + item.sql;
                        ae.appendChild(sqlDiv);
                    }

                    if (item.table) {
                        ae.insertAdjacentHTML('beforeend', item.table);
                    }

                    $thread.appendChild(ae);
                });
            } else {
                const temp_sql = j.SQL;
                const temp_table = j.TABLE;
                const temp_summary = j.SUMMARY;

                aiEl.textContent = '';

                const summaryDiv = document.createElement('div');
                const summaryB = document.createElement('b');
                summaryB.textContent = temp_summary || '';
                summaryDiv.appendChild(summaryB);
                aiEl.appendChild(summaryDiv);

                if (temp_sql) {
                    const sqlDiv = document.createElement('div');
                    sqlDiv.className = 'sql-debug';
                    sqlDiv.textContent = 'SQL: ' + temp_sql;
                    aiEl.appendChild(sqlDiv);
                }

                if (temp_table) {
                    aiEl.insertAdjacentHTML('beforeend', temp_table);
                }
            }
        } catch (ex) {
            aiEl.textContent = '';
            const errLabel = document.createElement('b');
            errLabel.textContent = 'Unexpected error:';
            aiEl.appendChild(errLabel);
            aiEl.appendChild(document.createTextNode(' ' + ex));
        }
        $thread.scrollTop = $thread.scrollHeight;
    };
    </script>
</body>
</html>
