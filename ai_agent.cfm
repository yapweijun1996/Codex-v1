<!--- ai_agent.cfm --->
<cfsetting enablecfoutputonly="true">
<cfcontent type="application/json">
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
		<cfset schemaPath = expandPath("./schema_config.json")>
		<cfif !fileExists(schemaPath)>
			<cfoutput>#serializeJSON({error="Missing schema_config.json."})#</cfoutput><cfabort>
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
		<cfset aiEngine = "gemini002"> <!--- Change to your desired engine if needed: gemini002, gpt002 --->
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
					<!--- Table Agent: Choose tables/columns (now supports multi-table) --->
					<cfset tableAgentSchema = {}>
					
					<cfloop collection="#parsedSchema#" item="tblName">
						<cfset oneTable = parsedSchema[tblName]>
						<cfset tableAgentSchema[tblName] = {
							"description": oneTable["description"],
							"document_types": structKeyExists(oneTable,"document_types") ? oneTable["document_types"] : {}
						}>
					</cfloop>
					
					<cfset tablePrompt = "
					#followup_examples#
					
					You are a table selection agent. Given the schema, user question, recent chat history, previous SQL, and previous summary,
					list the best table(s) for answering it.
					
					Reply ONLY as JSON:
					{""tables"": [{""table"":""...""}]}  (use multiple if needed)
					
					Schema:
					#serializeJSON(tableAgentSchema)#
					Chat history: #serializeJSON(chatHistory)#
					Previous SQL: #prevSQL#
					Previous summary: #prevSummary#
					Question: #userMsg#
					">
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
					
					<cfset filteredSchema = {}>
					
					<!--- Only include selected tables in schema --->
					<cfloop array="#selectedTables#" index="tbl">
						<cfif structKeyExists(parsedSchema, tbl.table)>
							<cfset filteredSchema[tbl.table] = parsedSchema[tbl.table]>
						</cfif>
					</cfloop>
					
					
					<!--- SQL Agent: Write SQL using filteredSchema --->
					<cfset sqlPrompt = "
					#followup_examples#
					
					You are a PostgreSQL SQL generator agent.
					
					**Task:**
					Given the database schema, a list of tables (JSON), user’s question, recent chat history, previous SQL, and previous summary,
					write a single SELECT statement (with JOIN if >1 table) to answer the question.
					
					**Strict Rules:**
					- Only generate SELECT statements.
					- Do NOT use *, always specify each column name explicitly.
					- For each column, use a descriptive alias with AS (e.g., staff_desc AS Salesperson).
					- Do NOT generate DELETE, UPDATE, INSERT, ALTER, or DROP statements.
					- Always include: WHERE tag_deleted_yn = 'n'
					- Always include: LIMIT 1000
					- Use JOINs if needed for multiple tables.
					- Output only the SQL. No explanations or comments.
					
					**Inputs:**
					Schema:
					#serializeJSON(filteredSchema)#
					
					Selected Tables (JSON):
					#serializeJSON(selectedTables)#
					
					Chat history:
					#serializeJSON(chatHistory)#
					
					Previous SQL:
					#prevSQL#
					
					Previous summary:
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
				<cfset prettyTable = "<div style='max-height: 200px;overflow: auto;'>">
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
