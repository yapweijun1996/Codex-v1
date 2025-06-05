<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<title>AI SQL Agent v2 (7 Agents Working Together)</title>
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<style>
			body { background: #f4f5fa; font-family: 'Segoe UI', Arial, sans-serif; }
			.wrap { max-width: 900px; margin: 40px auto; background: #fff; border-radius: 18px; box-shadow: 0 6px 30px #0001; padding: 2.5em; }
			h1 { color: #222; }
			#output { min-height: 120px; background: #f7f8fc; border-radius: 7px; border: 1px solid #e5e5e5; padding: 18px; margin-bottom: 18px; font-size: 1.11em; }
			.err { color: #c0392b; font-weight: bold; }
			.summary { font-size: 1.18em; margin: 6px 0 10px 0; color: #222; }
			.sql { background: #222; color: #aef; padding: 14px 18px; border-radius: 9px; font-size: .97em; margin: 10px 0 6px 0; font-family: 'JetBrains Mono', 'Consolas', 'Menlo', monospace; white-space: pre-wrap;}
			.table { background: #fff; border-radius: 6px; overflow-x: auto; margin: 10px 0 8px 0; font-size: .97em; }
			table { border-collapse: collapse; width: 100%; }
			th, td { padding: 7px 10px; border: 1px solid #dde; text-align: left; }
			th { background: #f0f4fc; }
			#loader { 
				display: none; 
				margin: 18px 0; 
				font-size: 1.12em; 
				color: #888;
				text-align: center;
				padding: 20px;
				background: linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%);
				border-radius: 12px;
				border: 1px solid #e3f2fd;
			}
			#question { width: 100%; min-height: 36px; font-size: 1em; padding: 9px; border-radius: 5px; border: 1px solid #ddd; margin-bottom: 12px; }
			#ask { padding: 11px 28px; font-size: 1.11em; background: #1a73e8; color: #fff; border: none; border-radius: 7px; cursor: pointer; transition: 0.2s; }
			#ask:hover { background: #1251a1; }
			.confirm-btn {
				font-size: 1.09em;
				padding: 9px 24px;
				border: none;
				border-radius: 7px;
				margin-right: 10px;
				margin-top: 4px;
				cursor: pointer;
				font-weight: 500;
				transition: 0.13s;
			}
			.confirm-btn.yes {
				background: #1a73e8;
				color: #fff;
			}
			.confirm-btn.yes:hover {
				background: #1555b3;
			}
			.confirm-btn.no {
				background: #c0392b;
				color: #fff;
			}
			.confirm-btn.no:hover {
				background: #922b1b;
			}
			/* Chat History Styles */
			#chatHistory { 
				margin-bottom: 25px; 
				background: #f9f9f9; 
				border-radius: 8px; 
				padding: 20px; 
				border: 1px solid #e8e8e8; 
				display: block;
			}
			#chatHistoryContainer { 
				max-height: 400px; 
				overflow-y: auto; 
				margin-bottom: 10px; 
			}
			.chat-message { 
				margin-bottom: 15px; 
				padding: 12px; 
				border-radius: 8px; 
				border: 1px solid #e5e5e5; 
			}
			.chat-user { 
				background: #e3f2fd; 
				border-left: 4px solid #1a73e8; 
			}
			.chat-ai { 
				background: #f5f5f5; 
				border-left: 4px solid #666; 
			}
			.chat-timestamp { 
				font-size: 0.85em; 
				color: #888; 
				margin-bottom: 5px; 
			}
			#clearHistory {
				float: right; 
				padding: 5px 10px; 
				font-size: 0.9em; 
				background: #f0f0f0; 
				border: 1px solid #ddd; 
				border-radius: 4px; 
				cursor: pointer;
				transition: 0.2s;
			}
			#clearHistory:hover {
				background: #e0e0e0;
			}
			.progress-container {
				margin: 15px 0;
			}
			.progress-bar {
				width: 100%;
				height: 6px;
				background: #e0e7ff;
				border-radius: 3px;
				overflow: hidden;
				margin: 10px 0;
			}
			.progress-fill {
				height: 100%;
				background: linear-gradient(90deg, #1a73e8 0%, #4285f4 100%);
				border-radius: 3px;
				transition: width 0.8s ease;
				width: 0%;
			}
			.agent-status {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 8px;
				margin: 8px 0;
				font-size: 0.95em;
			}
			.agent-icon {
				display: inline-block;
				width: 16px;
				height: 16px;
				border-radius: 50%;
				background: #1a73e8;
				position: relative;
			}
			.agent-icon.active {
				animation: pulse 1.5s infinite;
			}
			.cancel-btn {
				margin-top: 12px;
				padding: 6px 16px;
				background: #f1f3f4;
				border: 1px solid #dadce0;
				border-radius: 6px;
				cursor: pointer;
				font-size: 0.9em;
				color: #5f6368;
				transition: 0.2s;
			}
			.cancel-btn:hover {
				background: #e8eaed;
				border-color: #bdc1c6;
			}
			@keyframes pulse {
				0%, 100% { opacity: 1; transform: scale(1); }
				50% { opacity: 0.7; transform: scale(1.1); }
			}
			@media (max-width: 700px) { .wrap { padding: 1em; } }
			
			/* Enhanced Input System */
			.input-container {
				position: relative;
				margin-bottom: 20px;
			}
			
			#question {
				width: 100%;
				min-height: 60px;
				font-size: 1.05em;
				padding: 16px;
				border-radius: 12px;
				border: 2px solid #e8e8e8;
				margin-bottom: 0;
				transition: all 0.3s ease;
				resize: vertical;
				line-height: 1.4;
				box-sizing: border-box;
			}
			
			#question:focus {
				outline: none;
				border-color: #1a73e8;
				box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
			}
			
			.input-tools {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-top: 12px;
			}
			
			.example-queries {
				display: none;
				position: absolute;
				top: 100%;
				left: 0;
				right: 0;
				background: white;
				border: 1px solid #e8e8e8;
				border-radius: 8px;
				box-shadow: 0 4px 12px rgba(0,0,0,0.1);
				z-index: 100;
				margin-top: 4px;
			}
			
			.example-queries.show {
				display: block;
			}
			
			.example-category {
				padding: 12px 16px;
				border-bottom: 1px solid #f0f0f0;
			}
			
			.example-category:last-child {
				border-bottom: none;
			}
			
			.example-category h4 {
				margin: 0 0 8px 0;
				font-size: 0.9em;
				color: #666;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}
			
			.example-item {
				padding: 6px 8px;
				margin: 2px 0;
				border-radius: 4px;
				cursor: pointer;
				font-size: 0.95em;
				color: #333;
				transition: 0.2s;
			}
			
			.example-item:hover {
				background: #f8f9ff;
				color: #1a73e8;
			}
			
			.char-count {
				font-size: 0.85em;
				color: #999;
			}
			
			.show-examples-btn {
				padding: 8px 16px;
				background: #f8f9fa;
				border: 1px solid #e8e8e8;
				border-radius: 6px;
				font-size: 0.9em;
				color: #666;
				cursor: pointer;
				transition: 0.2s;
			}
			
			.show-examples-btn:hover {
				background: #e8f0fe;
				border-color: #1a73e8;
				color: #1a73e8;
			}
			
			/* Enhanced Confirmation Dialog */
			#confirmBox {
				background: linear-gradient(135deg, #fff8e1 0%, #fffbf0 100%);
				border: 2px solid #ffc107;
				border-radius: 12px;
				padding: 20px;
				margin-bottom: 18px;
				box-shadow: 0 4px 12px rgba(255, 193, 7, 0.2);
			}
			
			.confirm-header {
				display: flex;
				align-items: center;
				gap: 10px;
				margin-bottom: 16px;
				padding-bottom: 12px;
				border-bottom: 1px solid #ffecb3;
			}
			
			.confirm-icon {
				width: 24px;
				height: 24px;
				background: #ff9800;
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				color: white;
				font-weight: bold;
				font-size: 14px;
			}
			
			.confirm-title {
				font-weight: 600;
				color: #e65100;
				font-size: 1.1em;
			}
			
			.sql-preview {
				background: #1e1e1e;
				color: #d4edda;
				padding: 16px;
				border-radius: 8px;
				font-family: 'JetBrains Mono', 'Consolas', 'Menlo', monospace;
				margin: 12px 0;
				white-space: pre-wrap;
				font-size: 0.95em;
				line-height: 1.4;
				border: 1px solid #333;
			}
			
			.confirm-actions {
				display: flex;
				gap: 12px;
				align-items: center;
				margin-top: 16px;
			}
			
			.confirm-btn {
				font-size: 1.05em;
				padding: 10px 20px;
				border: none;
				border-radius: 8px;
				cursor: pointer;
				font-weight: 600;
				transition: all 0.2s ease;
				display: flex;
				align-items: center;
				gap: 6px;
			}
			
			.confirm-btn.yes {
				background: #4caf50;
				color: #fff;
				box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);
			}
			
			.confirm-btn.yes:hover {
				background: #45a049;
				transform: translateY(-1px);
				box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
			}
			
			.confirm-btn.no {
				background: #f44336;
				color: #fff;
				box-shadow: 0 2px 4px rgba(244, 67, 54, 0.3);
			}
			
			.confirm-btn.no:hover {
				background: #da190b;
				transform: translateY(-1px);
				box-shadow: 0 4px 8px rgba(244, 67, 54, 0.3);
			}
			
			.confirm-btn.edit {
				background: #2196f3;
				color: #fff;
				box-shadow: 0 2px 4px rgba(33, 150, 243, 0.3);
			}
			
			.confirm-btn.edit:hover {
				background: #1976d2;
				transform: translateY(-1px);
				box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
			}
			
			.sql-warning {
				background: #fff3e0;
				border: 1px solid #ffb74d;
				border-radius: 6px;
				padding: 12px;
				margin: 12px 0;
				font-size: 0.95em;
				color: #ef6c00;
			}
			
			/* Enhanced Data Tables */
			.results-container {
				background: #fff;
				border-radius: 12px;
				overflow: hidden;
				margin: 16px 0;
				box-shadow: 0 2px 8px rgba(0,0,0,0.1);
				border: 1px solid #e8e8e8;
			}
			
			.results-header {
				background: linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%);
				padding: 16px 20px;
				border-bottom: 1px solid #e3f2fd;
				display: flex;
				justify-content: space-between;
				align-items: center;
			}
			
			.results-title {
				font-weight: 600;
				color: #1565c0;
				font-size: 1.1em;
			}
			
			.results-actions {
				display: flex;
				gap: 8px;
			}
			
			.action-btn {
				padding: 6px 12px;
				background: #f5f5f5;
				border: 1px solid #ddd;
				border-radius: 6px;
				font-size: 0.85em;
				cursor: pointer;
				transition: 0.2s;
				color: #666;
			}
			
			.action-btn:hover {
				background: #e3f2fd;
				border-color: #1976d2;
				color: #1976d2;
			}
			
			.table-wrapper {
				overflow-x: auto;
				max-height: 500px;
				overflow-y: auto;
			}
			
			.enhanced-table {
				width: 100%;
				border-collapse: collapse;
				font-size: 0.95em;
			}
			
			.enhanced-table th {
				background: #f8f9fa;
				padding: 12px 16px;
				text-align: left;
				font-weight: 600;
				color: #495057;
				border-bottom: 2px solid #dee2e6;
				position: sticky;
				top: 0;
				z-index: 10;
			}
			
			.enhanced-table td {
				padding: 12px 16px;
				border-bottom: 1px solid #f8f9fa;
				vertical-align: top;
			}
			
			.enhanced-table tr:hover {
				background: #f8f9ff;
			}
			
			.enhanced-table .number-cell {
				text-align: right;
				font-family: 'JetBrains Mono', 'Consolas', monospace;
				font-weight: 500;
			}
			
			.enhanced-table .currency-cell {
				color: #2e7d32;
				font-weight: 600;
			}
			
			.enhanced-table .date-cell {
				color: #1976d2;
				font-size: 0.9em;
			}
			
			.row-count {
				padding: 12px 20px;
				background: #f8f9fa;
				border-top: 1px solid #e9ecef;
				font-size: 0.9em;
				color: #6c757d;
				text-align: center;
			}
			
			/* NEW: Chart and Totals Styles */
			.chart-container {
				margin: 15px 0;
				background: #fff;
				border-radius: 8px;
				border: 1px solid #e5e5e5;
			}
			
			.chart-recommendation {
				margin: 8px 0;
				padding: 10px;
				background: linear-gradient(135deg, #e3f2fd 0%, #f8f9ff 100%);
				border-radius: 6px;
				border-left: 4px solid #1a73e8;
				font-size: 0.95em;
				color: #333;
			}
			
			.totals-container {
				margin: 15px 0;
				padding: 18px;
				background: linear-gradient(135deg, #f8fffe 0%, #e8f5e8 100%);
				border-radius: 10px;
				border: 1px solid #d4ebd4;
				border-left: 5px solid #4caf50;
			}
			
			.totals-header {
				font-size: 1.1em;
				font-weight: 600;
				color: #2e7d32;
				margin-bottom: 12px;
			}
			
			.totals-summary {
				color: #333;
				line-height: 1.5;
			}
			
			.totals-grid {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
				gap: 12px;
				margin-bottom: 10px;
			}
			
			.totals-item {
				background: rgba(255, 255, 255, 0.7);
				padding: 12px;
				border-radius: 8px;
				border: 1px solid rgba(76, 175, 80, 0.2);
			}
			
			.totals-label {
				font-size: 0.9em;
				color: #666;
				margin-bottom: 4px;
				text-transform: uppercase;
				letter-spacing: 0.5px;
				font-weight: 500;
			}
			
			.totals-value {
				font-size: 1.3em;
				font-weight: 700;
				color: #2e7d32;
				font-family: 'Segoe UI', Arial, sans-serif;
			}
			
			.currency-breakdown {
				margin-top: 15px;
				padding-top: 15px;
				border-top: 1px solid rgba(76, 175, 80, 0.3);
			}
			
			.currency-header {
				font-weight: 600;
				color: #2e7d32;
				margin-bottom: 8px;
			}
			
			.currency-item {
				display: inline-block;
				background: rgba(255, 255, 255, 0.8);
				padding: 6px 12px;
				margin: 4px 6px 4px 0;
				border-radius: 20px;
				border: 1px solid rgba(76, 175, 80, 0.3);
				font-size: 0.9em;
				color: #2e7d32;
				font-weight: 500;
			}
			
			/* Enhanced Mobile Responsive Design */
			@media (max-width: 768px) {
				body { 
					margin: 0; 
					padding: 10px; 
					background: #f8f9ff; 
				}
				
				.wrap { 
					margin: 0; 
					padding: 20px; 
					border-radius: 12px; 
					max-width: 100%; 
				}
				
				h1 { 
					font-size: 1.5em; 
					text-align: center; 
					margin-bottom: 20px; 
				}
				
				#question {
					min-height: 80px;
					font-size: 16px; /* Prevent zoom on iOS */
					padding: 16px;
				}
				
				#ask {
					width: 100%;
					padding: 16px;
					font-size: 1.1em;
					margin-top: 8px;
				}
				
				.input-tools {
					flex-direction: column;
					gap: 10px;
					align-items: stretch;
				}
				
				.show-examples-btn {
					text-align: center;
					padding: 12px;
				}
				
				.example-queries {
					position: fixed;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					background: white;
					z-index: 1000;
					overflow-y: auto;
					padding: 20px;
					border-radius: 0;
					box-shadow: none;
					border: none;
				}
				
				.chat-message {
					padding: 16px;
					margin-bottom: 12px;
				}
				
				#chatHistoryContainer {
					max-height: 300px;
				}
				
				.confirm-actions {
					flex-direction: column;
					gap: 8px;
				}
				
				.confirm-btn {
					width: 100%;
					justify-content: center;
					padding: 14px;
				}
				
				.results-header {
					flex-direction: column;
					gap: 12px;
					align-items: stretch;
				}
				
				.results-actions {
					justify-content: space-between;
				}
				
				.enhanced-table {
					font-size: 0.85em;
				}
				
				.enhanced-table th,
				.enhanced-table td {
					padding: 8px 6px;
					word-break: break-word;
				}
				
				.table-wrapper {
					max-height: 400px;
				}
				
				.progress-container {
					margin: 10px 0;
				}
				
				.agent-status {
					font-size: 0.9em;
				}
				
				.cancel-btn {
					width: 100%;
					margin-top: 16px;
					padding: 12px;
				}
			}
			
			@media (max-width: 480px) {
				.wrap {
					padding: 16px;
				}
				
				h1 {
					font-size: 1.3em;
				}
				
				.enhanced-table {
					font-size: 0.8em;
				}
				
				.enhanced-table th,
				.enhanced-table td {
					padding: 6px 4px;
				}
				
				.action-btn {
					font-size: 0.8em;
					padding: 8px 6px;
				}
			}
		</style>
	</head>
	<body>
		<div class="wrap">
			<h1>AI SQL Agent v2 (7 Agents Working Together)</h1>
			
			<!-- Chat History Section -->
			<div id="chatHistory">
				<h3 style="color: #666; font-size: 1.1em; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
					Chat History
					<button id="clearHistory">Clear History</button>
				</h3>
				<div id="chatHistoryContainer"></div>
			</div>
			
			<div id="output"></div>
			<button id="toggleDebug" style="margin:10px 0;">Show Debug JSON</button>
			<pre id="debugPanel" style="display:none; background:#222; color:#aef; padding:12px; border-radius:8px; font-size:0.95em; max-height:300px; overflow:auto;"></pre>
			<div id="loader">
				<div class="agent-status">
					<span class="agent-icon active"></span>
					<span id="agent-text">AI is analyzing your question</span>
				</div>
				<div class="progress-container">
					<div class="progress-bar">
						<div class="progress-fill" id="progress-fill"></div>
					</div>
					<div id="progress-text">Processing step 1 of 4...</div>
				</div>
				<button class="cancel-btn" id="cancel-request">Cancel Request</button>
			</div>
			<div id="confirmBox" style="display:none; margin-bottom: 18px;">
				<div id="confirmText" style="margin-bottom: 12px;"></div>
				<button id="confirmYes" class="confirm-btn yes">Yes, run SQL</button>
				<button id="confirmNo" class="confirm-btn no">No</button>
			</div>
			<form id="chatForm" autocomplete="off">
				<div class="input-container">
					<textarea id="question" name="msg" placeholder="Type a question (e.g., Show latest transactions)"></textarea>
					<div class="input-tools">
						<button type="button" class="show-examples-btn">Show Examples</button>
						<span class="char-count">0/250</span>
					</div>
					<div class="example-queries">
						<div class="example-category">
							<h4>Advanced Business Queries</h4>
							<div class="example-item">List all sales invoice clients in SGD with amount (sum), order by client name</div>
							<div class="example-item">Show total sales by client in MYR, sorted by amount descending</div>
							<div class="example-item">List all sales invoices for 2010, group by client, show total amount, order by client name</div>
							<div class="example-item">Show all clients with more than 5 sales invoices in SGD, order by client name</div>
							<div class="example-item">List sales invoice clients, currency, and total amount for last quarter, order by amount</div>
							<div class="example-item">Show top 10 clients by total sales in SGD for 2010</div>
							<div class="example-item">List all sales invoice clients, show sum of amount for each, order by client name</div>
						</div>
						<div class="example-category">
							<h4>Sales Performance</h4>
							<div class="example-item">Who is the best salesman sgd?</div>
							<div class="example-item">Show top 5 salesmen by revenue sgd</div>
							<div class="example-item">Sales performance last month sgd</div>
							<div class="example-item">Top 10 salesmen in 2010 sgd</div>
							<div class="example-item">Sales by staff for Q4 2010 sgd</div>
							<div class="example-item">Show sales for staff RAMIE</div>
						</div>
						<div class="example-category">
							<h4>Customer Analysis</h4>
							<div class="example-item">Show top customers by purchase amount sgd</div>
							<div class="example-item">Customer transaction history</div>
							<div class="example-item">Which customer bought the most?</div>
							<div class="example-item">Top 5 clients in SGD</div>
							<div class="example-item">List customers with more than 10 transactions</div>
						</div>
						<div class="example-category">
							<h4>Transaction Details</h4>
							<div class="example-item">Show latest invoices</div>
							<div class="example-item">Details of invoice SIV12417</div>
							<div class="example-item">Show transactions from last week</div>
							<div class="example-item">Show all sales invoices in April 2010</div>
							<div class="example-item">Show transactions above 100,000 SGD</div>
						</div>
						<div class="example-category">
							<h4>Sales Trends</h4>
							<div class="example-item">Monthly sales invoice sgd trend for 2010</div>
							<div class="example-item">Compare sales by month for 2010 and 2011</div>
							<div class="example-item">Show sales invoice sgd growth rate by quarter for 2010</div>
							<div class="example-item">Sales trend for product ABC</div>
						</div>
						<div class="example-category">
							<h4>Currency Analysis</h4>
							<div class="example-item">Total sales in SGD</div>
							<div class="example-item">Show sales by currency</div>
							<div class="example-item">Top 5 clients in SGD</div>
							<div class="example-item">Sales by staff in SGD</div>
						</div>
						<div class="example-category">
							<h4>Data Quality & Audit</h4>
							<div class="example-item">Show transactions with empty staff name</div>
							<div class="example-item">List invoices with missing customer info</div>
							<div class="example-item">Show records with null amount</div>
							<div class="example-item">How many deleted records?</div>
						</div>
						<div class="example-category">
							<h4>Advanced Filters</h4>
							<div class="example-item">Show sales for staff RAMIE in 2010</div>
							<div class="example-item">Show invoices for customer ABC Corp in March 2010</div>
							<div class="example-item">List transactions between 2010-01-01 and 2010-03-31</div>
							<div class="example-item">Show sales above 1,000,000 SGD in 2010</div>
						</div>
					</div>
				</div>
				<button id="ask" type="submit">Ask AI</button>
			</form>
		</div>
		<script>
			const form = document.getElementById("chatForm");
			const output = document.getElementById("output");
			const loader = document.getElementById("loader");
			const confirmBox = document.getElementById("confirmBox");
			const confirmText = document.getElementById("confirmText");
			const confirmYes = document.getElementById("confirmYes");
			const confirmNo = document.getElementById("confirmNo");
			let dots = 0, dotsInterval, lastUserMsg = '', lastSQL = '';
			let currentRequest = null; // For request cancellation
			let progressInterval = null;
			let chatHistoryChartConfigs = [];
			
			const agentSteps = [
				{ text: "Analyzing your question...", progress: 15 },
				{ text: "Understanding intent...", progress: 30 },
				{ text: "Generating SQL query...", progress: 60 },
				{ text: "Executing database query...", progress: 85 },
				{ text: "Formatting results...", progress: 100 }
			];
			
			// Chat History Functions
			function showChatHistory() {
				document.getElementById('chatHistory').style.display = 'block';
			}
			
			function addToHistory(content, type) {
				const historyContainer = document.getElementById('chatHistoryContainer');
				const timestamp = new Date().toLocaleTimeString();
				
				const messageDiv = document.createElement('div');
				messageDiv.className = `chat-message chat-${type}`;
				messageDiv.innerHTML = `
					<div class="chat-timestamp">${timestamp}</div>
					${content}
				`;
				
				historyContainer.appendChild(messageDiv);
				historyContainer.scrollTop = historyContainer.scrollHeight;
				showChatHistory();
			}
			
			function getRecentHistory(maxMessages = 8) {
				const historyContainer = document.getElementById('chatHistoryContainer');
				const messageElements = historyContainer.querySelectorAll('.chat-message');
				const history = [];
				
				const startIndex = Math.max(0, messageElements.length - maxMessages);
				
				for (let i = startIndex; i < messageElements.length; i++) {
					const messageEl = messageElements[i];
					const isUser = messageEl.classList.contains('chat-user');
					const isAI = messageEl.classList.contains('chat-ai');
					
					const timestampEl = messageEl.querySelector('.chat-timestamp');
					const timestamp = timestampEl ? timestampEl.textContent : '';
					
					let content = messageEl.innerHTML;
					if (timestampEl) {
						content = content.replace(timestampEl.outerHTML, '').trim();
					}
					
					const tempDiv = document.createElement('div');
					tempDiv.innerHTML = content;
					const cleanContent = tempDiv.textContent || tempDiv.innerText || '';
					
					if (isUser) {
						history.push({
							type: 'user',
							content: cleanContent,
							timestamp: timestamp
						});
					} else if (isAI) {
						// Don't truncate AI content here - let backend handle it intelligently
						history.push({
							type: 'ai',
							content: cleanContent,
							timestamp: timestamp
						});
					}
				}
				
				return history;
			}
			
			// Clear History Function
			document.getElementById('clearHistory').onclick = function() {
				document.getElementById('chatHistoryContainer').innerHTML = '';
				document.getElementById('chatHistory').style.display = 'none';
				chatHistoryChartConfigs = [];
			};
			
			// Enhanced loading with agent progress
			function startLoader() {
				loader.style.display = "block";
				document.getElementById('progress-fill').style.width = '0%';
				document.getElementById('progress-text').textContent = 'Processing step 1 of 4...';
				document.getElementById('agent-text').textContent = agentSteps[0].text;
				
				let stepIndex = 0;
				progressInterval = setInterval(() => {
					if (stepIndex < agentSteps.length - 1) {
						stepIndex++;
						const step = agentSteps[stepIndex];
						document.getElementById('agent-text').textContent = step.text;
						document.getElementById('progress-fill').style.width = step.progress + '%';
						document.getElementById('progress-text').textContent = `Processing step ${stepIndex + 1} of ${agentSteps.length}...`;
					}
				}, 800);
			}
			
			function stopLoader() {
				loader.style.display = "none";
				if (progressInterval) {
					clearInterval(progressInterval);
					progressInterval = null;
				}
			}
			
			// Cancel request functionality
			document.getElementById('cancel-request').onclick = function() {
				if (currentRequest) {
					currentRequest.abort();
					currentRequest = null;
				}
				stopLoader();
				output.innerHTML = `<div style="color:#888; font-style:italic;">Request cancelled by user.</div>`;
			};
			
			function generateUniqueId() {
				return 'chart_' + Math.random().toString(36).substr(2, 9);
			}

			// Add a simple Markdown-to-HTML converter
			function renderMarkdown(md) {
				if (!md) return '';
				return md
					.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // bold
					.replace(/\*(.*?)\*/g, '<em>$1</em>') // italic
					.replace(/\n/g, ''); // line breaks
			}

			function showResponse(json, userMsg) {
				let html = `<b>User:</b> ${userMsg}<br>`;
				if(json.error || json.ERROR) {
					html += `<div class="err">${json.error || json.ERROR}</div>`;
					if (json.debug || json.DEBUG) html += `<div style="color:#aaa;">DEBUG: ${json.debug || json.DEBUG}</div>`;
					output.innerHTML = html;
					addToHistory(`<b>AI:</b> <div class="err">${json.error || json.ERROR}</div>`, 'ai');
					return;
				}
				// Build response HTML
				let historyHtml = '<b>AI:</b> ';
				if(json.summary || json.SUMMARY) {
					html += `<div class="summary">${renderMarkdown(json.summary || json.SUMMARY)}</div>`;
					historyHtml += `<div class="summary">${renderMarkdown(json.summary || json.SUMMARY)}</div>`;
				}
				// Auto-Totals
				if(json.TOTALS && (json.TOTALS.hasAmountData || json.TOTALS.totalRecords > 0)) {
					const totalsHtml = createTotalsDisplay(json.TOTALS);
					html += totalsHtml;
					historyHtml += totalsHtml;
				}
				// Chart logic for both containers
				if(json.CHART && json.CHARTCONFIG && json.CHARTCONFIG.canvasId) {
					// 1. For #output
					const outputCanvasId = generateUniqueId();
					let outputChartHtml = json.CHART.replace(json.CHARTCONFIG.canvasId, outputCanvasId);
					html += `<div class="chart-container">${outputChartHtml}</div>`;
					// Clone config for output
					const outputChartConfig = JSON.parse(JSON.stringify(json.CHARTCONFIG));
					outputChartConfig.canvasId = outputCanvasId;
					// 2. For #chatHistory
					const historyCanvasId = generateUniqueId();
					let historyChartHtml = json.CHART.replace(json.CHARTCONFIG.canvasId, historyCanvasId);
					historyHtml += `<div class="chart-container">${historyChartHtml}</div>`;
					// Clone config for history
					const historyChartConfig = JSON.parse(JSON.stringify(json.CHARTCONFIG));
					historyChartConfig.canvasId = historyCanvasId;
					// Store this config for later rendering
					chatHistoryChartConfigs.push(historyChartConfig);
					// Chart recommendation
					if(json.CHARTRECOMMENDATION && json.CHARTRECOMMENDATION.trim() !== '') {
						html += `<div class="chart-recommendation">📊 ${json.CHARTRECOMMENDATION}</div>`;
						historyHtml += `<div class="chart-recommendation">📊 ${json.CHARTRECOMMENDATION}</div>`;
					}
					// SQL, Table, Debug, etc.
					if(json.sql || json.SQL) {
						html += `<div class="sql">${json.sql || json.SQL}</div>`;
						historyHtml += `<div class="sql">${json.sql || json.SQL}</div>`;
					}
					if(json.table || json.TABLE) {
						const tableHtml = createEnhancedTable(json.table || json.TABLE, json.rowCount || json.ROWCOUNT);
						html += tableHtml;
						// --- Always include the table HTML in chat history for context-aware follow-ups ---
						historyHtml += tableHtml;
					}
					if(json.debug || json.DEBUG) {
						html += `<div style="color:#aaa; font-size:.95em; margin-top:7px;">DEBUG: ${json.debug || json.DEBUG}</div>`;
						historyHtml += `<div style="color:#aaa; font-size:.95em; margin-top:7px;">DEBUG: ${json.debug || json.DEBUG}</div>`;
					}
					if (json.DEBUGCOLUMNS) {
						html += `<div style="color:#888; font-size:.95em;">Debug Columns: ${Array.isArray(json.DEBUGCOLUMNS) ? json.DEBUGCOLUMNS.join(', ') : json.DEBUGCOLUMNS}</div>`;
						historyHtml += `<div style="color:#888; font-size:.95em;">Debug Columns: ${Array.isArray(json.DEBUGCOLUMNS) ? json.DEBUGCOLUMNS.join(', ') : json.DEBUGCOLUMNS}</div>`;
					}
					if (json.CHARTHTMLSTATUS) {
						html += `<div style="color:#888; font-size:.95em;">Chart HTML Status: ${json.CHARTHTMLSTATUS}</div>`;
						historyHtml += `<div style="color:#888; font-size:.95em;">Chart HTML Status: ${json.CHARTHTMLSTATUS}</div>`;
					}
					if (json.BUSINESSINTELLIGENCEDEBUG) {
						html += `<div style="color:#888; font-size:.95em;">BI Debug: ${JSON.stringify(json.BUSINESSINTELLIGENCEDEBUG)}</div>`;
						historyHtml += `<div style="color:#888; font-size:.95em;">BI Debug: ${JSON.stringify(json.BUSINESSINTELLIGENCEDEBUG)}</div>`;
					}
					output.innerHTML = html;
					document.getElementById('chatHistoryContainer').innerHTML += historyHtml;
					// Render all charts in chat history
					chatHistoryChartConfigs.forEach(cfg => renderChartFromConfig(cfg));
					// Render output chart (latest)
					renderChartFromConfig(outputChartConfig);
				} else {
					// Fallback: just update output as usual
					if(json.CHART && json.CHART.trim() !== '') {
						html += `<div class="chart-container">${json.CHART}</div>`;
						historyHtml += `<div class="chart-container">${json.CHART}</div>`;
						if(json.CHARTRECOMMENDATION && json.CHARTRECOMMENDATION.trim() !== '') {
							html += `<div class="chart-recommendation">📊 ${json.CHARTRECOMMENDATION}</div>`;
							historyHtml += `<div class="chart-recommendation">📊 ${json.CHARTRECOMMENDATION}</div>`;
						}
					}
					if(json.sql || json.SQL) {
						html += `<div class="sql">${json.sql || json.SQL}</div>`;
						historyHtml += `<div class="sql">${json.sql || json.SQL}</div>`;
					}
					if(json.table || json.TABLE) {
						const tableHtml = createEnhancedTable(json.table || json.TABLE, json.rowCount || json.ROWCOUNT);
						html += tableHtml;
						// --- Always include the table HTML in chat history for context-aware follow-ups ---
						historyHtml += tableHtml;
					}
					if(json.debug || json.DEBUG) {
						html += `<div style="color:#aaa; font-size:.95em; margin-top:7px;">DEBUG: ${json.debug || json.DEBUG}</div>`;
						historyHtml += `<div style="color:#aaa; font-size:.95em; margin-top:7px;">DEBUG: ${json.debug || json.DEBUG}</div>`;
					}
					if (json.DEBUGCOLUMNS) {
						html += `<div style="color:#888; font-size:.95em;">Debug Columns: ${Array.isArray(json.DEBUGCOLUMNS) ? json.DEBUGCOLUMNS.join(', ') : json.DEBUGCOLUMNS}</div>`;
						historyHtml += `<div style="color:#888; font-size:.95em;">Debug Columns: ${Array.isArray(json.DEBUGCOLUMNS) ? json.DEBUGCOLUMNS.join(', ') : json.DEBUGCOLUMNS}</div>`;
					}
					if (json.CHARTHTMLSTATUS) {
						html += `<div style="color:#888; font-size:.95em;">Chart HTML Status: ${json.CHARTHTMLSTATUS}</div>`;
						historyHtml += `<div style="color:#888; font-size:.95em;">Chart HTML Status: ${json.CHARTHTMLSTATUS}</div>`;
					}
					if (json.BUSINESSINTELLIGENCEDEBUG) {
						html += `<div style="color:#888; font-size:.95em;">BI Debug: ${JSON.stringify(json.BUSINESSINTELLIGENCEDEBUG)}</div>`;
						historyHtml += `<div style="color:#888; font-size:.95em;">BI Debug: ${JSON.stringify(json.BUSINESSINTELLIGENCEDEBUG)}</div>`;
					}
					output.innerHTML = html;
					document.getElementById('chatHistoryContainer').innerHTML += historyHtml;
					// Render chart if present
					if (json.CHARTCONFIG && json.CHARTCONFIG.canvasId) {
						renderChartFromConfig(json.CHARTCONFIG);
					}
				}
				// Show debug JSON in panel
				document.getElementById('debugPanel').textContent = JSON.stringify(json, null, 2);
			}
			function showConfirmation(sql, userMsg) {
				const isDestructive = /delete|drop|truncate|update.*set/i.test(sql);
				const warningText = isDestructive ? 
					'<div class="sql-warning">⚠️ Warning: This query may modify data. Please review carefully.</div>' : '';
				
				confirmText.innerHTML = `
					<div class="confirm-header">
						<div class="confirm-icon">!</div>
						<div class="confirm-title">SQL Confirmation Required</div>
					</div>
					<div style="margin-bottom: 12px;">
						<strong>Your Question:</strong> ${userMsg}
					</div>
					${warningText}
					<div style="margin-bottom: 8px;"><strong>Generated SQL:</strong></div>
					<div class="sql-preview">${sql}</div>
					<div style="color: #666; font-size: 0.95em; margin-bottom: 12px;">
						This query will be executed on your database. Please review before proceeding.
					</div>
					<div class="confirm-actions">
						<button id="confirmYes" class="confirm-btn yes">
							<span>✓</span> Execute Query
						</button>
						<button id="confirmEdit" class="confirm-btn edit">
							<span>✏️</span> Modify Question
						</button>
						<button id="confirmNo" class="confirm-btn no">
							<span>✗</span> Cancel
						</button>
					</div>
				`;
				
				confirmBox.style.display = "block";
				window.scrollTo(0, document.body.scrollHeight);
				
				// Add edit functionality
				document.getElementById('confirmEdit').onclick = function() {
					confirmBox.style.display = "none";
					document.getElementById('question').value = lastUserMsg;
					document.getElementById('question').focus();
					addToHistory('<b>You:</b> <span style="color: #2196f3;">✏️ Chose to modify the question</span>', 'user');
				};
				
				addToHistory(`
					<b>AI:</b> SQL confirmation required before running your query.
					<pre class="sql" style="background:#222;color:#aef;padding:14px 18px;border-radius:9px;font-size:0.9em;">${sql}</pre>
					<div style="margin:10px 0; color:#888;">Waiting for confirmation...</div>
				`, 'ai');
			}
			confirmYes.onclick = async function() {
				addToHistory('<b>You:</b> <span style="color: #1a73e8;">✓ Confirmed SQL execution</span>', 'user');
				
				confirmBox.style.display = "none";
				startLoader();
				try {
					const recentHistory = getRecentHistory(8);
					
					// Create abort controller for cancellation
					const controller = new AbortController();
					currentRequest = controller;
					
					const data = new URLSearchParams({ 
						msg: lastUserMsg, 
						confirmed: 1,
						chatHistory: JSON.stringify(recentHistory)
					});
					const res = await fetch("ai_agent.cfm", {
						method: "POST",
						headers: { "Content-Type": "application/x-www-form-urlencoded" },
						body: data,
						signal: controller.signal
					});
					const json = await res.json();
					currentRequest = null;
					stopLoader();
					showResponse(json, lastUserMsg);
				} catch (e) {
					currentRequest = null;
					stopLoader();
					if (e.name === 'AbortError') {
						return; // Request was cancelled
					}
					output.innerHTML = `<div class="err">Failed to connect to server.</div>`;
					addToHistory('<b>AI:</b> <div class="err">Failed to connect to server.</div>', 'ai');
				}
			};
			confirmNo.onclick = function() {
				addToHistory('<b>You:</b> <span style="color: #c0392b;">✗ Cancelled SQL execution</span>', 'user');
				
				confirmBox.style.display = "none";
				output.innerHTML = `<div class="err">SQL execution cancelled. You can modify your question or ask something else.</div>`;
				addToHistory('<b>AI:</b> <div class="err">SQL execution cancelled. You can modify your question or ask something else.</div>', 'ai');
			};
			form.addEventListener("submit", async function(e) {
				e.preventDefault();
				const q = document.getElementById("question").value.trim();
				if(!q) return;
				
				addToHistory(`<b>You:</b> ${q}`, 'user');
				document.getElementById("question").value = '';
				
				output.innerHTML = "";
				startLoader();
				lastUserMsg = q;
				try {
					const recentHistory = getRecentHistory(8);
					
					// Create abort controller for cancellation
					const controller = new AbortController();
					currentRequest = controller;
					
					const data = new URLSearchParams({ 
						msg: q,
						chatHistory: JSON.stringify(recentHistory)
					});
					const res = await fetch("ai_agent.cfm", {
						method: "POST",
						headers: { "Content-Type": "application/x-www-form-urlencoded" },
						body: data,
						signal: controller.signal
					});
					const json = await res.json();
					currentRequest = null;
					stopLoader();
					
					if(json.needConfirmation || json.NEEDCONFIRMATION) {
						lastSQL = json.sql || json.SQL;
						showConfirmation(json.sql || json.SQL, q);
					} else {
						showResponse(json, q);
					}
				} catch (e) {
					currentRequest = null;
					stopLoader();
					if (e.name === 'AbortError') {
						return; // Request was cancelled
					}
					output.innerHTML = `<div class="err">Failed to connect to server.</div>`;
					addToHistory('<b>AI:</b> <div class="err">Failed to connect to server.</div>', 'ai');
				}
			});
			
			document.getElementById('question').addEventListener('keydown', function(e) {
				if (e.key === 'Enter' && !e.shiftKey) {
					e.preventDefault();
					document.getElementById('ask').click();
				}
			});
			
			// Example queries functionality
			const showExamplesBtn = document.querySelector('.show-examples-btn');
			const exampleQueries = document.querySelector('.example-queries');
			const questionInput = document.getElementById('question');
			
			showExamplesBtn.addEventListener('click', function(e) {
				e.preventDefault();
				exampleQueries.classList.toggle('show');
				this.textContent = exampleQueries.classList.contains('show') ? 'Hide Examples' : 'Show Examples';
			});
			
			// Example item click handlers
			document.addEventListener('click', function(e) {
				if (e.target.classList.contains('example-item')) {
					questionInput.value = e.target.textContent;
					exampleQueries.classList.remove('show');
					showExamplesBtn.textContent = 'Show Examples';
					questionInput.focus();
				}
			});
			
			// Character count functionality
			const charCount = document.querySelector('.char-count');
			
			questionInput.addEventListener('input', function() {
				const length = this.value.length;
				charCount.textContent = length + '/250';
				
				// Change color based on character count
				if (length > 200) {
					charCount.style.color = '#c0392b';
				} else if (length > 150) {
					charCount.style.color = '#e67e22';
				} else {
					charCount.style.color = '#999';
				}
			});
			
			// Hide examples when clicking outside
			document.addEventListener('click', function(e) {
				if (!e.target.closest('.input-container')) {
					exampleQueries.classList.remove('show');
					showExamplesBtn.textContent = 'Show Examples';
				}
			});
			
			// Enhanced table rendering
			function createEnhancedTable(tableHtml, rowCount = 0) {
				if (!tableHtml || tableHtml.trim() === '') {
					return '';
				}
				// Parse the basic table HTML
				const tempDiv = document.createElement('div');
				tempDiv.innerHTML = tableHtml;
				const table = tempDiv.querySelector('table');
				if (!table) return tableHtml;
				// Add enhanced classes and formatting
				table.className = 'enhanced-table';
				// Format cells based on content
				const rows = table.querySelectorAll('tr');
				rows.forEach((row, rowIndex) => {
					const cells = row.querySelectorAll('td, th');
					cells.forEach(cell => {
						const content = cell.textContent.trim();
						// Check for different data types and apply appropriate styling
						if (content.match(/^\d{4}-\d{2}-\d{2}/)) {
							cell.classList.add('date-cell');
						} else if (content.match(/^\d+(\.\d+)?$/) || content.match(/^[\d,]+(\.\d+)?$/)) {
							cell.classList.add('number-cell');
							// Remove auto-formatting with commas
							// if (content.match(/^\d+$/)) {
							//     cell.textContent = parseInt(content).toLocaleString();
							// }
						} else if (content.match(/^\d+(\.\d+)?\s*[A-Z]{3}$/)) {
							cell.classList.add('currency-cell');
						}
					});
				});
				// --- Lump Sum Row Logic ---
				// Find AMOUNT column index
				const headerCells = table.querySelectorAll('tr th');
				let amountColIdx = -1;
				let staffColIdx = -1;
				let currencyColIdx = -1;
				// Enhanced: Recognize more amount/total column names (case/space/underscore insensitive)
				const amountPatterns = [
					/amount/i,
					/total\s*amount/i,
					/total/i,
					/sum/i,
					/nettot/i,
					/nettot_forex/i,
					/grand\s*total/i,
					/total_sales/i,
					/totalamount/i,
					/total_sales/i
				];
				headerCells.forEach((cell, idx) => {
					const txt = cell.textContent.trim().toLowerCase().replace(/[_\s]+/g, '');
					// Recognize common amount/total column names
					for (const pattern of amountPatterns) {
						if (pattern.test(cell.textContent.trim())) {
							amountColIdx = idx;
							break;
						}
						// Also check normalized (no spaces/underscores)
						if (pattern.test(txt)) {
							amountColIdx = idx;
							break;
						}
					}
					if (txt === 'staff' || txt === 'supplier') staffColIdx = idx;
					if (txt === 'currency') currencyColIdx = idx;
					if (txt === 'client') staffColIdx = idx; // Also support 'client' as the label column
				});
				if (amountColIdx !== -1) {
					// Sum all numeric values in AMOUNT column
					let sum = 0;
					let hasDecimal = false;
					const bodyRows = table.querySelectorAll('tr');
					bodyRows.forEach((row, i) => {
						// skip header
						if (i === 0) return;
						const cells = row.querySelectorAll('td');
						if (cells.length > amountColIdx) {
							let val = cells[amountColIdx].textContent.replace(/,/g, '').trim();
							if (!isNaN(val) && val !== '') {
								if (val.includes('.')) hasDecimal = true;
								sum += parseFloat(val);
							}
						}
					});
					// Build total row
					const totalRow = document.createElement('tr');
					for (let i = 0; i < headerCells.length; i++) {
						const td = document.createElement('td');
						if (i === staffColIdx) {
							td.textContent = 'Total';
							td.style.fontWeight = 'bold';
						} else if (i === currencyColIdx) {
							td.textContent = '';
						} else if (i === amountColIdx) {
							td.textContent = hasDecimal ? sum.toFixed(2) : sum;
							td.style.fontWeight = 'bold';
							td.classList.add('number-cell');
						} else {
							td.textContent = '';
						}
						totalRow.appendChild(td);
					}
					table.appendChild(totalRow);
				}
				// --- End Lump Sum Row Logic ---
				// Create the enhanced container
				const container = document.createElement('div');
				container.className = 'results-container';
				container.innerHTML = `
					<div class="results-header">
						<div class="results-title">Query Results</div>
						<div class="results-actions">
							<button class="action-btn" onclick="exportTableData('csv')">📊 Export CSV</button>
							<button class="action-btn" onclick="copyTableData(this)">📋 Copy</button>
							<button class="action-btn" onclick="printTable()">🖨️ Print</button>
						</div>
					</div>
					<div class="table-wrapper">
						${table.outerHTML}
					</div>
					<div class="row-count">
						${rowCount} record${rowCount !== 1 ? 's' : ''} found
					</div>
				`;
				return container.outerHTML;
			}
			
			// NEW: Auto-Totals Display Function
			function createTotalsDisplay(totals) {
				if (!totals || (!totals.hasAmountData && totals.totalRecords === 0)) {
					return '';
				}
				
				let html = `<div class="totals-container">`;
				
				// Summary text if available
				if (totals.summaryText) {
					html += `<div class="totals-summary">${totals.summaryText}</div>`;
				} else {
					// Build basic totals display
					html += `<div class="totals-header">📊 Summary Statistics</div>`;
					html += `<div class="totals-grid">`;
					
					// Total records
					html += `<div class="totals-item">
						<div class="totals-label">Total Records</div>
						<div class="totals-value">${totals.totalRecords.toLocaleString()}</div>
					</div>`;
					
					// Grand total if available
					if (totals.grandTotalFormatted) {
						html += `<div class="totals-item">
							<div class="totals-label">Grand Total</div>
							<div class="totals-value">${totals.grandTotalFormatted}</div>
						</div>`;
					}
					
					// Average if available
					if (totals.averageAmountFormatted && totals.averageAmountFormatted !== '0') {
						html += `<div class="totals-item">
							<div class="totals-label">Average Amount</div>
							<div class="totals-value">${totals.averageAmountFormatted}</div>
						</div>`;
					}
					
					html += `</div>`;
					
					// Currency breakdown if multiple currencies
					if (totals.currencyBreakdown && totals.currencyBreakdown.length > 1) {
						html += `<div class="currency-breakdown">
							<div class="currency-header">Currency Breakdown:</div>`;
						totals.currencyBreakdown.forEach(currency => {
							html += `<div class="currency-item">${currency}</div>`;
						});
						html += `</div>`;
					}
				}
				
				html += `</div>`;
				return html;
			}
			
			// Export functionality
			function exportTableData(format) {
				const table = document.querySelector('.enhanced-table');
				if (!table) return;
				
				let csvContent = '';
				const rows = table.querySelectorAll('tr');
				
				rows.forEach(row => {
					const cells = row.querySelectorAll('th, td');
					const rowData = Array.from(cells).map(cell => 
						'"' + cell.textContent.trim().replace(/"/g, '""') + '"'
					).join(',');
					csvContent += rowData + '\n';
				});
				
				const blob = new Blob([csvContent], { type: 'text/csv' });
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = 'query_results.csv';
				a.click();
				window.URL.revokeObjectURL(url);
			}
			
			function copyTableData(btn) {
				const table = document.querySelector('.enhanced-table');
				if (!table) return;
				
				let textContent = '';
				const rows = table.querySelectorAll('tr');
				
				rows.forEach(row => {
					const cells = row.querySelectorAll('th, td');
					const rowData = Array.from(cells).map(cell => cell.textContent.trim()).join('\t');
					textContent += rowData + '\n';
				});
				
				navigator.clipboard.writeText(textContent).then(() => {
					// Show temporary feedback
					const originalText = btn.textContent;
					btn.textContent = '✓ Copied!';
					btn.style.background = '#4caf50';
					btn.style.color = 'white';
					setTimeout(() => {
						btn.textContent = originalText;
						btn.style.background = '';
						btn.style.color = '';
					}, 2000);
				});
			}
			
			function printTable() {
				const table = document.querySelector('.enhanced-table');
				if (!table) return;
				
				const printWindow = window.open('', '_blank');
				printWindow.document.write(`
					<html>
						<head>
							<title>Query Results</title>
							<style>
								body { font-family: Arial, sans-serif; margin: 20px; }
								table { border-collapse: collapse; width: 100%; }
								th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
								th { background-color: #f2f2f2; }
								.number-cell { text-align: right; }
							</style>
						</head>
						<body>
							<h2>Query Results - ${new Date().toLocaleString()}</h2>
							${table.outerHTML}
						</body>
					</html>
				`);
				printWindow.document.close();
				printWindow.print();
			}
			
			// Debug panel toggle
			document.getElementById('toggleDebug').onclick = function() {
				const panel = document.getElementById('debugPanel');
				if (panel.style.display === 'none') {
					panel.style.display = 'block';
					this.textContent = 'Hide Debug JSON';
				} else {
					panel.style.display = 'none';
					this.textContent = 'Show Debug JSON';
				}
			};
			
			function loadChartJs(callback) {
				if (window.Chart) {
					callback();
					return;
				}
				var script = document.createElement('script');
				script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
				script.onload = callback;
				document.body.appendChild(script);
			}
			
			function renderChartFromConfig(config) {
				loadChartJs(function() {
					var ctx = document.getElementById(config.canvasId);
					if (!ctx) return;
					// If a chart already exists on this canvas, destroy it first
					if (ctx._chartInstance) {
						ctx._chartInstance.destroy();
					}
					ctx._chartInstance = new Chart(ctx, config);
				});
			}
		</script>
	</body>
</html>
