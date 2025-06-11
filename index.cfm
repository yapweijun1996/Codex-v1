<!DOCTYPE html>
<html>
<head>
    <title>Business Report AI Agent</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
        body { font-family: system-ui, Arial, sans-serif; background: #f4f6fa; margin: 0; padding: 0; }
        .main { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 10px; box-shadow: 0 4px 18px #0002; padding: 32px 28px; }
        h1 { font-size: 1.3rem; margin: 0 0 22px; letter-spacing: 1px; }
        form { display: flex; gap: 10px; }
        input, button { font-size: 1rem; border-radius: 8px; border: 1px solid #bbb; padding: 8px 14px; }
        input { flex: 1; }
        button { background: #2d69e0; color: #fff; border: none; cursor: pointer; }
        button:active { background: #1b3977; }
        .result { margin: 32px 0 0; background: #fcfcfc; border-radius: 8px; padding: 18px 16px; box-shadow: 0 1px 4px #0001;}
        .biz-table { border-collapse: collapse; margin-top: 10px; }
        .biz-table th, .biz-table td { border: 1px solid #ddd; padding: 3px 4px; font-size: 12px; }
        .biz-table th { background: #f0f4ff; }
        .sql-debug { font-family: "JetBrains Mono",monospace,monospace; color: #888; font-size: .94rem; background: #f6f6fa; margin: 8px 0 0; padding: 7px 10px; border-radius: 4px;}
    </style>
</head>
<body>
    <div class="main">
        <h1>Business Report AI Agent</h1>
        <form id="qform" autocomplete="off">
            <input name="msg" id="msg" list="presetQueries" placeholder="e.g. Top sales by staff in 2023" required>
            <datalist id="presetQueries">
                <option value="Show latest purchase order"></option>
                <option value="Show latest sales invoice"></option>
                <option value="Top 10 Client for Sales Invoice"></option>
                <option value="Top 10 Supplier for Purchase Order"></option>
            </datalist>
            <button type="submit">Ask</button>
        </form>
        <div id="result" class="result" style="display:none"></div>
    </div>
    <script>
    const $form = document.getElementById('qform');
    const $msg = document.getElementById('msg');
    const $result = document.getElementById('result');
    $msg.addEventListener('focus', () => {
        $msg.dispatchEvent(new Event('input', {bubbles: true}));
    });
    $form.onsubmit = async (e) => {
        e.preventDefault();
        $result.innerHTML = "Generating report...";
        $result.style.display = "block";
        const fd = new FormData($form);
        try {
            const r = await fetch('ai_agent.cfm', {method:"POST", body:fd});
            const j = await r.json();
            console.log(j); // <----- add this line
            if(j.error){
                $result.innerHTML = "<b>❌ Error:</b> " + j.error + (j.details? "<br>"+j.details : "");
                return;
            }
            
            const temp_sql = j.SQL;
            const temp_table = j.TABLE;
            const temp_summary = j.SUMMARY;
            
            $result.innerHTML =
                "<div><b>" + (temp_summary||"") + "</b></div>" +
                (temp_sql ? `<div class="sql-debug">SQL: ${temp_sql}</div>` : "") +
                (temp_table ? temp_table : "");
        } catch(ex){
            $result.innerHTML = "<b>Unexpected error:</b> " + ex;
        }
    };
    </script>
</body>
</html>
