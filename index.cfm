<cfif NOT structKeyExists(session,"loggedIn") OR NOT session.loggedIn>
    <cflocation url="login.cfm" addtoken="false">
</cfif>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Business Analytics Chat</title>
    <style>
        :root {
            --background:#f7f7f7;
            --container-bg:#fff;
            --text-color:#333;
            --border-color:#ccc;
            --button-bg:#007bff;
            --button-text:#fff;
        }
        body {
            font-family:'Segoe UI', Arial, sans-serif;
            background:var(--background);
            color:var(--text-color);
            line-height:1.5;
            margin:0; padding:20px;
        }
        .chat-container {
            max-width:800px; margin:auto; background:var(--container-bg);
            border-radius:8px; box-shadow:0 0 10px rgba(0,0,0,0.1); padding:20px;
        }
        .dark-mode {
            --background:#1a1a1a;
            --container-bg:#222;
            --text-color:#e0e0e0;
            --button-bg:#555;
        }
        .dark-mode input[type="text"] { background:#333; border-color:#555; color:var(--text-color); }
        #messages { min-height:200px; }
        .msg { margin:10px 0; }
        .user { font-weight:bold; }
        .bot { color:var(--text-color); }
        #debug { background:#fafafa; border:1px solid #ddd; padding:10px; margin-top:20px; font-size:0.9em; max-height:200px; overflow:auto; }
        form { display:flex; gap:10px; margin-top:15px; }
        input[type="text"] {
            flex:1; padding:10px; border:1px solid var(--border-color); border-radius:4px;
            font-size:1em;
        }
        button {
            padding:10px 15px; background:var(--button-bg); color:var(--button-text);
            border:none; border-radius:4px; cursor:pointer;
        }
        table { border-collapse: collapse; width:100%; margin-top:10px; }
        th,td { border:1px solid var(--border-color); padding:5px; text-align:left; }
        .tour-overlay {
            position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6);
            display:flex; align-items:center; justify-content:center; z-index:1000;
        }
        .tour-box {
            background:var(--container-bg); color:var(--text-color); padding:20px; border-radius:8px;
            max-width:300px; text-align:center;
        }
        @media (max-width:600px){
            body { padding:10px; }
            form { flex-direction: column; }
        }
    </style>
</head>
<body>
<div id="tour" class="tour-overlay" style="display:none;">
    <div class="tour-box">
        <p>Use this chat to ask business questions. Toggle ♥ dark mode for a different look.</p>
        <button id="tour-close">Got it!</button>
    </div>
</div>
<button id="toggle-dark" style="margin-bottom:10px;">🌙 Toggle Dark Mode</button> <a href="logout.cfm">Logout</a>
<div class="chat-container">
    <div id="messages"></div>
    <form id="chat-form">
        <input id="user-input" aria-label="Chat message" type="text" placeholder="Ask a question..." autocomplete="off" required autofocus>
        <button aria-label="Send message" type="submit">➤ Send</button>
    </form>
    <div id="debug"></div>
</div>
<script>
function addMessage(role, text){
    const div = document.createElement("div");
    div.className = "msg " + role;
    div.textContent = role + ": " + text;
    const container = document.getElementById("messages");
    container.appendChild(div);
    div.scrollIntoView();
}
function addDebug(text){
    const p = document.createElement('div');
    p.textContent=text;
    document.getElementById('debug').appendChild(p);
}
async function callAgent(text){
    const res = await fetch('ask.cfm', {
        method: 'POST',
        headers: {'Content-Type':'application/x-www-form-urlencoded'},
        body: new URLSearchParams({msg:text})
    });
    return res.json();
}
async function runSQL(sql){
    const res = await fetch('runQuery.cfm?sql='+encodeURIComponent(sql));
    return res.json();
}
document.addEventListener("DOMContentLoaded", ()=>{
    addMessage("bot", "Welcome to the analytics chat! Ask a question to get started.");
    if(!localStorage.getItem('tourShown')){
        document.getElementById('tour').style.display='flex';
    }
});

document.getElementById('chat-form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if(!text){
        addMessage("bot", "Please enter a question before submitting.");
        return;
    }
    input.value="";
    addMessage('user', text);
    input.focus();
    const agent = await callAgent(text);
    if(agent.error){
        addMessage("bot", "Error: "+agent.error);
        return;
    }
    (agent.debug||[]).forEach(addDebug);
    let reply = agent.response || '';
    if(agent.mode==='sql' && agent.sql){
        const data = await runSQL(agent.sql);
        if(data.error){
            addMessage("bot", "Query error: "+data.error);
        } else if(data.rows){
            const table = document.createElement('table');
            const header = document.createElement('tr');
            Object.keys(data.rows[0]||{}).forEach(col=>{
                const th=document.createElement('th'); th.textContent=col; header.appendChild(th);
            });
            table.appendChild(header);
            data.rows.forEach(row=>{
                const tr=document.createElement('tr');
                Object.values(row).forEach(val=>{ const td=document.createElement('td'); td.textContent=val; tr.appendChild(td);});
                table.appendChild(tr);
            });
            document.getElementById('messages').appendChild(table);
            table.scrollIntoView();
        }
    }
    addMessage('bot', reply);
});
document.getElementById('toggle-dark').addEventListener('click', ()=>{
    document.body.classList.toggle('dark-mode');
});
document.getElementById('tour-close').addEventListener('click', ()=>{
    document.getElementById('tour').style.display='none';
    localStorage.setItem('tourShown','1');
});
</script>
</body>
</html>
