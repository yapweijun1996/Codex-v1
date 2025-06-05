<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Business Analytics Chat</title>
    <style>
        body { font-family: Arial, sans-serif; background:#f7f7f7; margin:0; padding:20px; }
        .chat-container { max-width:800px; margin:auto; background:#fff; border-radius:8px; box-shadow:0 0 10px rgba(0,0,0,0.1); padding:20px; }
        #messages { min-height:200px; }
        .msg { margin:10px 0; }
        .user { font-weight:bold; }
        .bot { color:#333; }
        #debug { background:#fafafa; border:1px solid #ddd; padding:10px; margin-top:20px; font-size:0.9em; max-height:200px; overflow:auto; }
        #debug.hidden { display:none; }
        #loading { margin-top:10px; }
        #toggle-debug { margin-top:10px; }
        form { display:flex; gap:10px; margin-top:15px; }
        input[type="text"] { flex:1; padding:10px; border:1px solid #ccc; border-radius:4px; }
        button { padding:10px 15px; }
        table { border-collapse: collapse; width:100%; margin-top:10px; }
        th,td { border:1px solid #ccc; padding:5px; text-align:left; }
    </style>
</head>
<body>
<div class="chat-container">
    <div id="messages"></div>
    <form id="chat-form">
        <input id="user-input" type="text" placeholder="Ask a question..." autocomplete="off" required>
        <button type="submit">Send</button>
    </form>
    <button id="toggle-debug" type="button">Toggle Debug</button>
    <div id="loading" style="display:none">Loading…</div>
    <div id="debug"></div>
</div>
<script>
function addMessage(role, text){
    const div = document.createElement('div');
    div.className='msg '+role;
    div.textContent=role+': '+text;
    document.getElementById('messages').appendChild(div);
}
function addDebug(text){
    const p = document.createElement('div');
    p.textContent=text;
    document.getElementById('debug').appendChild(p);
}
const loading = document.getElementById('loading');
function setLoading(show){
    loading.style.display = show ? 'block' : 'none';
}
async function callAgent(text){
    try {
        const res = await fetch('ask.cfm', {
            method: 'POST',
            headers: {'Content-Type':'application/x-www-form-urlencoded'},
            body: new URLSearchParams({msg:text})
        });
        return await res.json();
    } catch (err) {
        addDebug('Agent error: '+err.message);
        return {error:'Agent request failed'};
    }
}
async function runSQL(sql){
    try {
        const res = await fetch('runQuery.cfm?sql='+encodeURIComponent(sql));
        return await res.json();
    } catch (err) {
        addDebug('SQL request error: '+err.message);
        return {error:'SQL request failed'};
    }
}
document.getElementById('chat-form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if(!text) return;
    input.value='';
    addMessage('user', text);
    setLoading(true);
    const agent = await callAgent(text);
    (agent.debug||[]).forEach(addDebug);
    let reply = agent.response || '';
    if(agent.error){
        reply = agent.error;
    }
    if(agent.mode==='sql' && agent.sql){
        addDebug('SQL: '+agent.sql);
        const data = await runSQL(agent.sql);
        if(data.error){
            addDebug('SQL Error: '+data.error);
            reply = 'SQL Error: '+data.error;
        }
        if(data.rows){
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
        }
    }
    addMessage('bot', reply);
    setLoading(false);
});
document.getElementById('toggle-debug').addEventListener('click',()=>{
    document.getElementById('debug').classList.toggle('hidden');
});
</script>
</body>
</html>
