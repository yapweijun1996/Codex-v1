<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Simple AI SQL Agent</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f4f4f4; }
        .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; }
        textarea { width: 100%; height: 80px; }
        button { padding: 8px 16px; margin-top: 10px; }
        #output { margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>AI SQL Agent v2 (Simple)</h1>
        <form id="form">
            <textarea id="question" name="question" placeholder="Ask a question..."></textarea>
            <br>
            <button type="submit" id="ask">Ask</button>
        </form>
        <div id="output"></div>
    </div>
<script>
const form = document.getElementById('form');
form.addEventListener('submit', async function(e){
    e.preventDefault();
    const q = document.getElementById('question').value.trim();
    if(!q) return;
    document.getElementById('output').innerHTML = 'Loading...';
    const data = new URLSearchParams({msg: q});
    try {
        const res = await fetch('ai_agent2.cfm', {
            method: 'POST',
            headers: {'Content-Type':'application/x-www-form-urlencoded'},
            body: data
        });
        const json = await res.json();
        if(json.error){
            document.getElementById('output').innerHTML = '<span style="color:red">'+json.error+'</span>';
        } else {
            let html = '';
            if(json.summary) html += '<p>'+json.summary+'</p>';
            if(json.table) html += json.table;
            if(json.sql) html += '<pre>'+json.sql+'</pre>';
            document.getElementById('output').innerHTML = html;
        }
    }catch(e){
        document.getElementById('output').innerHTML = '<span style="color:red">Request failed</span>';
    }
});
</script>
</body>
</html>
