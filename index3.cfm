<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Business Analytics AI Chat</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1"></script>
    <style>
        body { background:#f5f6fa; }
        .chat-history { max-height:40vh; overflow-y:auto; }
        .chat-msg { padding:6px 8px; border-radius:4px; margin-bottom:6px; }
        .chat-msg.user { background:#e3f2fd; }
        .chat-msg.ai { background:#f1f1f1; }
        .example { cursor:pointer; }
        #chart { max-height:300px; }
    </style>
</head>
<body>
<div class="container-fluid py-3">
  <div class="row">
    <div class="col-md-4 mb-3">
      <div class="p-3 bg-white border rounded-2 mb-3" style="max-height:90vh; overflow-y:auto;">
        <div class="mb-4">
          <h5 class="fw-bold">💡 What can I ask?</h5>
          <p class="small">Use these sample prompts or enter your own question below.</p>
          <ul class="list-unstyled" id="exampleList">
            <li class="example mb-1">Show me total sales by department this year</li>
            <li class="example mb-1">List all workflow-approved purchase orders for customer 10001</li>
            <li class="example mb-1">Sales invoice totals by month, as a line chart</li>
            <li class="example mb-1">Find purchase requests for March grouped by department</li>
            <li class="example mb-1">What currencies are used in recent sales invoices?</li>
            <li class="example mb-1">Pie chart of purchase order count by vendor</li>
            <li class="example mb-1">Show delivery orders from last week</li>
          </ul>
          <hr/>
          <p class="small">You can:</p>
          <ul class="small">
            <li>Ask for summaries, breakdowns, or trends</li>
            <li>Filter by customer, vendor, staff, department, or date</li>
            <li>Request document types like sales invoices or purchase orders</li>
            <li>Ask for bar, line, or pie charts</li>
          </ul>
          <p class="small">Tips for Best Results:</p>
          <ul class="small">
            <li>Be specific about dates and document types</li>
            <li>Use "group by" for summaries</li>
            <li>Ask for "approved only" when needed</li>
          </ul>
          <p class="small text-danger">Not supported: data modification or exports.</p>
          <p class="small">Example prompts:</p>
          <ul class="list-unstyled" id="copyExamples">
            <li class="example mb-1">Total purchase amount by department for 2023</li>
            <li class="example mb-1">Workflow-approved sales invoices for customer 12345 in March</li>
            <li class="example mb-1">Pie chart of sales amount by customer</li>
            <li class="example mb-1">All delivery orders in May, grouped by warehouse</li>
          </ul>
        </div>
        <h6 class="fw-bold">Chat History</h6>
        <div id="history" class="chat-history"></div>
      </div>
    </div>
    <div class="col-md-8">
      <div class="p-3 bg-white border rounded-2 mb-3">
        <div id="summary" class="mb-3"></div>
        <div class="table-responsive">
          <table id="dataTable" class="table table-sm table-bordered"></table>
        </div>
        <canvas id="chart" class="my-3"></canvas>
      </div>
      <div class="mb-3">
        <textarea id="prompt" class="form-control" rows="3" placeholder="Type your question..."></textarea>
      </div>
      <button id="sendBtn" class="btn btn-primary">Send</button>
      <span id="loading" class="ms-2 text-muted d-none">Loading...</span>
      <div id="error" class="mt-2 text-danger"></div>
    </div>
  </div>
</div>

<script>
let chatHistory = [];
let chartInstance = null;

function renderHistory(){
  const hist = document.getElementById('history');
  hist.innerHTML='';
  chatHistory.forEach(h=>{
    const div=document.createElement('div');
    div.className='chat-msg '+(h.ai? 'ai':'user');
    div.textContent=(h.ai? 'AI: ':'You: ')+ (h.content||'');
    hist.appendChild(div);
  });
  hist.scrollTop = hist.scrollHeight;
}

function renderTable(rows){
  const table = document.getElementById('dataTable');
  table.innerHTML='';
  if(!rows || rows.length===0){return;}
  const thead=document.createElement('thead');
  const headerRow=document.createElement('tr');
  Object.keys(rows[0]).forEach(col=>{
    const th=document.createElement('th');
    th.textContent=col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);table.appendChild(thead);
  const tbody=document.createElement('tbody');
  rows.forEach(r=>{
    const tr=document.createElement('tr');
    Object.keys(r).forEach(col=>{
      const td=document.createElement('td');
      td.textContent=r[col];
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function renderChart(chartData){
  const canvas = document.getElementById("chart");
  if (chartInstance) { chartInstance.destroy(); }
  if (!chartData || chartData.type === "none") {
    canvas.classList.add("d-none");
    return;
  }
  canvas.classList.remove("d-none");
  chartInstance = new Chart(canvas, {
    type: chartData.type,
    data: {
      labels: chartData.labels || [],
      datasets: [{
        label: "",
        data: chartData.values || [],
        backgroundColor: "rgba(54,162,235,0.5)",
        borderColor: "rgba(54,162,235,1)",
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}


async function sendPrompt(){
  const q=document.getElementById('prompt').value.trim();
  if(!q)return;
  document.getElementById('error').textContent='';
  document.getElementById('loading').classList.remove('d-none');
  chatHistory.push({content:q,ai:false});
  renderHistory();
  try{
    const form=new URLSearchParams();
    form.append('prompt',q);
    form.append('chatHistory',JSON.stringify(chatHistory));
    const res=await fetch('ai_chat_backend.cfm',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
    const json=await res.json();
    document.getElementById('loading').classList.add('d-none');
    if(json.error){
      document.getElementById('error').textContent=json.error;
      chatHistory.push({content:json.error,ai:true});
      renderHistory();
      return;
    }
    document.getElementById('summary').textContent=json.summary||'';
    renderTable(json.rawData);
    renderChart(json.chartData);
    chatHistory=json.chatHistory||chatHistory;
    chatHistory.push({content:json.summary,ai:true});
    renderHistory();
  }catch(e){
    document.getElementById('loading').classList.add('d-none');
    document.getElementById('error').textContent='Request failed';
  }
  document.getElementById('prompt').value='';
}

document.getElementById('sendBtn').addEventListener('click',sendPrompt);

// Example prompt click
Array.from(document.querySelectorAll('.example')).forEach(el=>{
  el.addEventListener('click',()=>{
    document.getElementById('prompt').value=el.textContent;
    document.getElementById('prompt').focus();
  });
});
</script>
</body>
</html>
