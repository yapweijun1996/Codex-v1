<!--- ai_agent.cfm --->
<cfsetting enablecfoutputonly="true">
<cfcontent type="application/json">

<cfset vle_more_debug_log_yn = "n">
<cftry>
	<!--- 1. Get User Input --->
	<cfparam name="form.msg" default="">
	<cfparam name="url.msg" default="">
	<cfset userMsg = trim(form.msg ?: url.msg ?: "")>
	<cfif !len(userMsg)>
		<cfoutput>#serializeJSON({error="No question provided."})#</cfoutput><cfabort>
	</cfif>
	<!--- Chat history passed as JSON string --->
	<cfparam name="form.chatHistory" default="">
	<cfset chatHistory = []>
	<cfif len(form.chatHistory)>
		<cftry>
			<cfset chatHistory = deserializeJSON(form.chatHistory)>
			<cfcatch>
				<cfset chatHistory = []>
			</cfcatch>
		</cftry>
	</cfif>
	
	<!--- 2. Extract previous SQL and summary from chatHistory, if available --->
	<cfset prevSQL = "">
	<cfset prevSummary = "">
	<cfif arrayLen(chatHistory) GT 0>
		<cfloop from="#arrayLen(chatHistory)#" to="1" step="-1" index="i">
			<cfif structKeyExists(chatHistory[i], "ai")>
				<cfset aiMsg = chatHistory[i].ai>
				<!--- Extract SQL --->
				<cfset regex = "SQL:\s*([^<\n;]+;?)">
				<cfset res = refind(regex, aiMsg, 1, true)>
				<cfif arrayLen(res.len) GTE 2 AND res.len[2] GT 0>
					<cfset prevSQL = mid(aiMsg, res.pos[2], res.len[2])>
				</cfif>
				<!--- Extract summary --->
				<cfset prevSummary = rereplacenocase(aiMsg, "SQL:.*", "", "one")>
				<cfbreak>
			</cfif>
		</cfloop>
	</cfif>
	
	<!--- 3. Load Schema --->
	<cfset schemaPath = expandPath("./Database_Relation_Scheme/database_relation_schema.json")>
	<cfif !fileExists(schemaPath)>
		<cfoutput>#serializeJSON({error="Missing database_relation_schema.json."})#</cfoutput><cfabort>
	</cfif>
	<cfset schemaString = fileRead(schemaPath)>
	<cfset parsedSchema = deserializeJSON(schemaString)>
	
	<!--- 4. Few-shot EXAMPLES for better LLM reasoning --->
	<cfset followup_examples = "
	Examples:
	User: Show me best salesman for 2020
	AI: (runs SQL grouped by staff for 2020)
	User: by date transaction
	AI: (runs similar SQL, but groups by transaction date, salesman)
	
	User: Show monthly sales total for 2021
	AI: (runs SQL grouped by month)
	User: by salesman
	AI: (runs SQL grouped by month, salesman)
	
	User: Who was the top salesman in 2010?
	AI: The top salesman in 2010 was Hiroshi Fujita with total sales of SGD 6,809,931.26.
	User: who again?
	AI: Hiroshi Fujita.
	User: show all names
	AI: Hiroshi Fujita, Kim Meng Tan, Chee Guan Hong, Micheal Tan, K T Chan, Ali Ahmadijeah, Chin Beng Seng, John Choi, Muthu Arumugam, Allen Berry, Tommy Shen, Yew Huat Xue, Priscella Pan, Chin Seow Yeong, Lim Toh Ting, Jacqueline Hu, Kim Hu Tao, Pang Seah Heng.
	User: details?
	AI: (shows the full table or more info)
	
	User: Just give me the names.
	AI: Hiroshi Fujita, Kim Meng Tan, Chee Guan Hong, ...
	User: Repeat
	AI: (repeats the last answer)
	User: Next year
	AI: (runs the same analysis for the next year)
	
	Instruction:
	- If the user's message is a follow-up, such as 'who again?', 'names only', 'repeat last', or is ambiguous, answer by using the previous result or summary directly, **without running new SQL or repeating the whole table** unless needed.
	- Only run a new SQL if the user's request cannot be answered from the previous result.
	- If unclear, ask the user for clarification.
	- When possible, summarize and only show relevant info.
	">
	
	
	<!--- 5. PLAN AGENT: Decide tool chain --->
	<cfset aiEngine = "gpt002"> <!--- Change to your desired engine if needed: gemini002, gpt002, gpt001 --->
	<cfset planPrompt = "
	#followup_examples#
	
	You are an AI planner. Given this user message, recent chat history, previous SQL, and previous summary, decide which tools/agents should be used, in order, to answer it.
	Choose from: [table, sql, summary, chat].
	Reply ONLY as a JSON list of agent steps, e.g. [""table"", ""sql"", ""summary""] or [""chat""].
	Chat history (previous turns): #serializeJSON(chatHistory)#
	Previous SQL: #prevSQL#
	Previous summary: #prevSummary#
	Question: #userMsg#
	">
	<cfset planSession = LuceeCreateAISession(name=aiEngine, systemMessage=planPrompt)>
	<cfset planResponse = LuceeInquiryAISession(planSession, userMsg)>
	<cfset plan = []>
	<cftry>
		<cfset plan = deserializeJSON(planResponse)>
		<cfcatch>
			<cfset plan = ["table","sql","summary"]>
		</cfcatch>
	</cftry>
	
	<!--- 6. Enforce data task grouping logic --->
	<cfset isDataTask = arrayFindNoCase(plan, "table") or arrayFindNoCase(plan, "sql") or arrayFindNoCase(plan, "summary")>
	<cfif isDataTask>
		<cfset plan = ["table", "sql", "summary"]>
	<cfelseif arrayFindNoCase(plan, "chat")>
		<cfset plan = ["chat"]>
	<cfelse>
		<cfset plan = ["chat"]>
	</cfif>
	
	<cfset log = []>
	<cfset tableName = "">
	<cfset columns = ["*"]>
	<cfset sql = "">
	<cfset prettyTable = "">
	<cfset summary = "">
	<cfset stepData = {}>
	<cfset debugAgents = []>
	
	<cfloop array="#plan#" index="step">
		<cfswitch expression="#step#">
			<cfcase value="table">
				<!--- Serialize transaction_types struct to JSON string --->
				<cfset transaction_types_jsonString = serializeJSON(parsedSchema.transaction_types)>
				
				<!--- Table Agent: Choose tables/columns (now supports multi-table) --->
				<cfset tableAgentSchema = {}>
				
				<cfloop array="#parsedSchema.tables#" index="tbl">
					<cfset arrayAppend(tableAgentSchema, {
						name = tbl.name,
						description = tbl.description,
						filters = tbl.filters
					})>
				</cfloop>
				<cfset tableAgentSchema_jsonOutput = serializeJSON(tableAgentSchema)>
				
				<cfset tablePrompt = '
				#followup_examples#
				
				You are a table selection agent. Given the schema, user question, recent chat history, previous SQL, and previous summary,
				list the best table(s) for answering it.
				
				Consider related tables by foreign keys as needed.
				
				Output JSON array of tables, e.g.
				
				{"tables":[{"table":"scm_sal_main"},{"table":"scm_sal_data"}]}
				
				Reply ONLY as JSON:
				{"tables": [{"table":"..."}]}  (use multiple if needed)
				
				transaction_types:
				transaction_types_jsonString
				
				Schema:
				#tableAgentSchema_jsonOutput#
				
				Chat history: #serializeJSON(chatHistory)#
				
				Previous SQL: #prevSQL#
				
				Previous summary: #prevSummary#
				
				Question: #userMsg#
				'>
				
				<cfset tableSession = LuceeCreateAISession(name=aiEngine, systemMessage=tablePrompt)>
				<cfset tableResult = LuceeInquiryAISession(tableSession, userMsg)>
				
				<!--- Log both input and output --->
				<cfset arrayAppend(debugAgents, {
					agent: "table",
					input: tablePrompt,
					output: tableResult
				})>
				
				
				<cfset stepData['table'] = tableResult>
				<cfset selectedTables = []>
				<cftry>
					<cfset tempTable = deserializeJSON(tableResult)>
					<cfif structKeyExists(tempTable, "tables")>
						<cfset selectedTables = tempTable.tables>
					<cfelse>
						<cfset selectedTables = []>
					</cfif>
					<cfcatch>
						<cfset selectedTables = []>
					</cfcatch>
				</cftry>
				
				<cfset arrayAppend(log, "Table agent: " & tableResult)>
			</cfcase>
			
			<cfcase value="sql">
				
				<cfif isDefined("vle_more_debug_log_yn") AND TRIM(vle_more_debug_log_yn) EQ "y">
					<cfset parsedSchema_jsonString = serializeJSON(parsedSchema)>
					<cfset arrayAppend(log, "parsedSchema_jsonString: " & parsedSchema_jsonString)>
				</cfif>
				
				<cfset common_rules_jsonString = serializeJSON(parsedSchema.common_rules)>
				<cfif isDefined("vle_more_debug_log_yn") AND TRIM(vle_more_debug_log_yn) EQ "y">
					<cfset arrayAppend(log, "common_rules_jsonString: " & common_rules_jsonString)>
				</cfif>
				
				<cfset transaction_types_jsonString = serializeJSON(parsedSchema.transaction_types)>
				<cfif isDefined("vle_more_debug_log_yn") AND TRIM(vle_more_debug_log_yn) EQ "y">
					<cfset arrayAppend(log, "transaction_types_jsonString: " & transaction_types_jsonString)>
				</cfif>
				
				<cfset filteredSchema = []>
				
				<!--- Only include selected tables in schema --->
				<cfloop array="#selectedTables#" index="tbl">
					<cfset temp_table = tbl.table>
					<cfloop array="#parsedSchema.tables#" index="schemaTable">
						<cfif schemaTable.name eq temp_table>
							<cfset arrayAppend(filteredSchema, {
								name = schemaTable.name,
								description = schemaTable.description,
								fields = schemaTable.fields,
								common_queries = schemaTable.common_queries,
								filters = schemaTable.filters
							})>
						</cfif>
					</cfloop>
				</cfloop>
				
				<!--- Serialize to JSON string --->
				<cfset jsonFilteredSchema = serializeJSON(filteredSchema)>
				<cfset arrayAppend(log, "jsonFilteredSchema: " & jsonFilteredSchema)>
				
				
				<!--- SQL Agent: Write SQL using filteredSchema --->
				<cfset sqlPrompt = "
				#followup_examples#
				
				You are a PostgreSQL SQL generator agent specialized in the following schemas:
				
				- scm_sal_main (Sales & Logistics Headers)
				- scm_sal_data (Sales & Logistics Line Items)
				- scm_pur_main (Purchase Headers)
				
				**Task:**
				Given the database schema, a list of tables (JSON), the user question, recent chat history, previous SQL, and summary,
				generate a single, valid SELECT statement using explicit column names and proper JOINs to answer the question.
				
				Given a list of tables and their foreign key relationships, generate a valid SELECT query joining the tables correctly by their foreign keys.
				Do not hardcode any join conditions. Use the schema's foreign key info to join tables.
				Only generate SELECT statements with explicit columns.
				
				**Strict Rules:**
				
				- Only generate SELECT statements (no DELETE, UPDATE, INSERT, ALTER, DROP).
				- Do NOT use SELECT *; specify all columns explicitly with descriptive aliases (e.g., staff_desc AS Salesperson).
				- Always include WHERE tag_deleted_yn = 'n' to filter out logically deleted rows.
				- Apply additional default filters per table, e.g.:
				- scm_sal_main: AND tag_void_yn = 'n'
				- scm_sal_data: AND tag_void_yn = 'n'
				- Always include LIMIT between 1 and 100, based on query context.
				- Use JOINs to connect tables by their foreign key relationships (e.g., scm_sal_main.uniquenum_pri = scm_sal_data.uniquenum_pri).
				- If the user mentions specific document types or their abbreviations (e.g., PCAR, CCAR), use the correct tag_table_usage in WHERE clause:
				- PCAR → tag_table_usage = 'entp_pbill'
				- CCAR → tag_table_usage = 'entp_pcar'
				- entp_pcar is not 'PCAR'
				- SI → tag_table_usage = 'sal_inv'
				- SO → tag_table_usage = 'sal_soe'
				- DO → tag_table_usage = 'stk_do'
				- PO → tag_table_usage = 'pur_po'
				- Always ensure tag_table_usage condition matches the user's document type context and never interchange codes.
				- For time-based queries, prefer date_trans columns.
				- When querying amounts, always select the associated currency column.
				- When grouping by staff or salesperson, exclude NULL or empty staff_desc values.
				- Output only the final SQL query, no comments or explanations.
				
				
				**Inputs:**
				
				Transaction Types:
				#transaction_types_jsonString#
				
				Common Rules:
				#common_rules_jsonString#
				
				Schema:
				#jsonFilteredSchema#
				
				Selected Tables:
				#serializeJSON(selectedTables)#
				
				Chat History:
				#serializeJSON(chatHistory)#
				
				Previous SQL:
				#prevSQL#
				
				Previous Summary:
				#prevSummary#
				
				User Question:
				#userMsg#
				">
				
				<cfset sqlSession = LuceeCreateAISession(name=aiEngine, systemMessage=sqlPrompt)>
				<cfset sql = LuceeInquiryAISession(sqlSession, userMsg)>
				
				<cfset arrayAppend(debugAgents, {
					agent: "sql",
					input: sqlPrompt,
					output: sql
				})>
				
				<!--- Strip code fences and extra formatting from SQL --->
				<cfset sql = rereplacenocase(sql, "^\s*```(\w+)?", "", "one")>
				<cfset sql = rereplacenocase(sql, "```", "", "all")>
				<cfset sql = trim(sql)>
				<cfset stepData['sql'] = sql>
				<cfset arrayAppend(log, "SQL agent: " & sql)>
			</cfcase>
			
			
			<cfcase value="summary">
				<!--- Will be run after SQL executed. See below. --->
			</cfcase>
			<cfcase value="chat">
				<!--- Chat Agent: For chit-chat/non-SQL --->
				<cfset chatPrompt = "
				#followup_examples#
				
				You are a chat agent. Given the user question, recent chat history, previous SQL, and previous summary, answer the question in a conversational style for business users.
				Chat history: #serializeJSON(chatHistory)#
				Previous SQL: #prevSQL#
				Previous summary: #prevSummary#
				Question: #userMsg#
				">
				<cfset chatSession = LuceeCreateAISession(name=aiEngine, systemMessage=chatPrompt)>
				<cfset summary = LuceeInquiryAISession(chatSession, userMsg)>
				
				<cfset arrayAppend(debugAgents, {
					agent: "sql",
					input: chatPrompt,
					output: userMsg
				})>
				
				
				<cfset arrayAppend(log, "Chat agent: " & summary)>
			</cfcase>
			<cfdefaultcase>
				<cfset arrayAppend(log, "Unknown agent step: " & step)>
			</cfdefaultcase>
		</cfswitch>
	</cfloop>
	
	<!--- 7. If SQL was generated, execute it --->
	<cfset chartSpec = {}> <!--- default empty --->
	<cfset data = {recordCount=0}>
	<cfif len(sql) GT 0>
		<cftry>
			<cfif not refindnocase("^select\s", sql)>
				<cfoutput>#serializeJSON({error="Refused to execute non-SELECT SQL", sql=sql})#</cfoutput><cfabort>
			</cfif>
			<cfquery name="data" datasource="#cookie.cooksql_mainsync#_active" timeout="20">
				#preserveSingleQuotes(sql)#
			</cfquery>
			<cfcatch>
				<cfoutput>#serializeJSON({error="SQL execution failed", details=cfcatch.message, sql=sql, debugAgents=debugAgents, plan=plan, log=log})#</cfoutput><cfabort>
			</cfcatch>
		</cftry>
		
		<!--- 8. Make pretty HTML table --->
		<cfif data.recordCount>
			<cfset prettyTable = "<div style='max-height: 433px;overflow: auto;'>">
			<cfset prettyTable &= "<table class='biz-table'><tr>">
			<cfloop list="#data.columnlist#" index="col">
				<cfset prettyTable &= "<th>" & encodeForHTML(col) & "</th>">
			</cfloop>
			<cfset prettyTable &= "</tr>">
			<cfloop query="data">
				<cfset prettyTable &= "<tr>">
				<cfloop list="#data.columnlist#" index="col">
					<cfset prettyTable &= "<td>" & encodeForHTML(data[col]) & "</td>">
				</cfloop>
				<cfset prettyTable &= "</tr>">
			</cfloop>
			<cfset prettyTable &= "</table></div>">
		<cfelse>
			<cfset prettyTable = "No records found.">
		</cfif>
		
		<!--- 8A. Chart Agent: Generate chart config suggestion if data found --->
		<cfif data.recordCount>
			<!--- Sample first 10 rows --->
			<cfset chartSample = []>
			<cfloop from="1" to="#min(10, data.recordCount)#" index="i">
				<cfset row = {} >
				<cfloop list="#data.columnList#" index="col">
					<cfset row[col] = data[col][i]>
				</cfloop>
				<cfset arrayAppend(chartSample, row)>
			</cfloop>
			
			<!--- Prompt for Chart Recommendation --->
			<cfset chartPrompt = '
			You are a charting assistant. Given a sample of SQL result data (JSON), recommend up to 3 suitable chart types from the following supported list only:
			
			- line
			- bar
			- radar
			- doughnut
			- pie
			- bubble
			- scatter
			- polarArea
			- mixed (combination of bar and line)
			- area
			- stackedBar
			- steppedLine
			- sparkline
			- funnel
			- sankey
			
			Important notes:
			
			- If the data includes a time dimension (e.g., months or dates) and multiple years, recommend a "bar" or "line" chart that compares these years side by side to visualize Year-over-Year (YoY) trends.
			- For YoY charts, use grouped bars (bar chart with multiple datasets) or multi-line charts showing each year data.
			- For horizontal bars, do NOT use "horizontalBar" (deprecated). Instead, use "bar" with option `"indexAxis": "y"`.
			- The "stackedBar" type means a bar chart with stacked datasets, use `type: "bar"` and set `options.scales.x.stacked = true` and/or `options.scales.y.stacked = true`.
			- "mixed" chart means combining bar and line datasets in one chart.
			- Use exact type names as above (e.g., "line", "bar", "pie", etc.) matching Chart.js naming conventions.
			- Output only JSON with chart configs, no explanations.
			
			Output a JSON array of chart config objects for Chart.js, for example:
			[
				{
					"title": "Year-over-Year Sales Comparison",
					"type": "bar",
					"labels": [...],
					"datasets": [...]
				},
				{
					"title": "Sales Over Time",
					"type": "line",
					"x": "date_trans",
					"y": "amount_local",
					"labels": [...],
					"datasets": [...]
				},
				{
					"title": "Sales by Product",
					"type": "pie",
					"labels": [...],
					"datasets": [...]
				},
				{
					"title": "Sales Over Time",
					"type": "line",
					"labels": [...],
					"datasets": [...]
				},
				{
					"title": "Sales by Product Category",
					"type": "bar",
					"options": {"indexAxis": "y"},
					"labels": [...],
					"datasets": [...]
				},
				{
					"title": "Market Share",
					"type": "pie",
					"labels": [...],
					"datasets": [...]
				}
			]
			
			Strict rules:
			- Only suggest up to 3 charts.
			- Each chart config must include "title" describing the chart purpose.
			- Choose appropriate chart types and map columns accordingly.
			- Output only JSON, no explanations.
			
			Sample data:
			#serializeJSON(chartSample)#
			'>
			
			<cfset chartSession = LuceeCreateAISession(name=aiEngine, systemMessage=chartPrompt)>
			<cfset chartSpecRaw = LuceeInquiryAISession(chartSession, userMsg)>
			
			<!--- Try to parse JSON --->
			<cftry>
				<cfset chartSpec = deserializeJSON(chartSpecRaw)>
				<cfcatch>
					<cfset chartSpec = {}> <!--- fallback --->
				</cfcatch>
			</cftry>
			
			<cfset arrayAppend(log, "Chart Agent: " & chartPrompt & " Output: " & chartSpecRaw)>
		</cfif>
	</cfif>
	
	<!--- 9. If summary step is in plan, run summary agent --->
	<cfif arrayFindNoCase(plan, "summary")>
		<cfset summaryPrompt = "
		You are a business analyst summarizer.
		
		Your job is to read the user’s question, the SQL query, the SQL results, recent chat history, and relevant context.
		Summarize the business insight or answer in 2-3 clear sentences, using plain language for a non-technical business user.
		
		**Instructions:**
		- Do not mention SQL, tables, or technical details.
		- Focus only on the business meaning and main insights in the result.
		- If the result is empty or no data matches, say so in business terms.
		- If previous summaries or follow-up examples are available, use them as a reference for tone and style.
		- Only output the summary, nothing else.
		
		**Inputs:**
		1. Follow-up Examples: #followup_examples#
		2. SQL Query: #sql#
		3. SQL Result Data: #serializeJSON(data)#
		4. Chat History: #serializeJSON(chatHistory)#
		5. Previous SQL: #prevSQL#
		6. Previous Summary: #prevSummary#
		7. User Question: #userMsg#
		
		">
		<cfset summarySession = LuceeCreateAISession(name=aiEngine, systemMessage=summaryPrompt)>
		<cfset summary = LuceeInquiryAISession(summarySession, userMsg)>
		<cfset arrayAppend(log, "Summary Agent: " & summary)>
	</cfif>
	
	<!--- 10. Output --->
	<cfoutput>
	#serializeJSON({
		PLAN = plan,
		TABLE = prettyTable,
		SQL = sql,
		SUMMARY = summary,
		CHART = chartSpec,
		LOG = log,
		DEBUG = stepData,
		AGENTS = debugAgents
	})#
</cfoutput>

<cfcatch>
	<cfoutput>#serializeJSON({error="Unexpected server error", details=cfcatch.message})#</cfoutput>
</cfcatch>
</cftry>
<cfabort>
