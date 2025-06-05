<cfsetting enablecfoutputonly="true">
<cfcontent type="application/json">

<cfset chartRules = deserializeJSON(fileRead(expandPath("./ai_agent_chart_config.json")))>
<cfset totalsRules = deserializeJSON(fileRead(expandPath("./ai_agent_totals_config.json")))>
<cfset schema = deserializeJSON(fileRead(expandPath("./schema_config.json")))>

<!--- Enhanced Error Logging and Debugging --->
<cfif NOT isDefined("cookie.cooksql_mainsync")>
	<cflog file="ai_agent_errors" text="CRITICAL: Database cookie 'cooksql_mainsync' not found. User: #cgi.remote_addr#">
	<cfoutput>
		#serializeJSON({
			error = "Database connection not configured. Please contact administrator.",
			debug = "Missing database configuration cookie",
			timestamp = now()
		})#
	</cfoutput>
	<cfabort>
</cfif>

<!--- Basic Request Validation --->
<cfparam name="form.msg" default="">
<cfparam name="url.msg" default="">
<cfparam name="form.confirmed" default="">
<cfparam name="url.confirmed" default="">
<cfparam name="form.chatHistory" default="">
<cfparam name="url.chatHistory" default="">

<!--- 1. AI schema knowledge (complete schema) --->
<cfset userMsgLower = lcase(form.msg)>

<!--- Build a schema summary for the AI agent --->
<cfset schemaSummary = "">
<cfloop collection="#schema#" item="tableName">
	<cfif isStruct(schema[tableName]) AND structKeyExists(schema[tableName], "document_types")>
		<cfset docTypes = structKeyArray(schema[tableName]["document_types"])/>
		<cfset schemaSummary &= "- " & tableName & ": [" & arrayToList(docTypes, ", ") & "]\n">
	</cfif>
</cfloop>

<!--- Add user-friendly document type mapping (table + doc_type) --->
<cfset docTypeUserMap = [
	{ terms: ["sales invoice", "invoice", "inv"], table: "scm_sal_main", doc_type: "sal_inv" },
	{ terms: ["delivery order", "do"], table: "scm_sal_main", doc_type: "stk_do" },
	{ terms: ["purchase order confirmation", "poc"], table: "scm_pur_main", doc_type: "pur_poc" },
	{ terms: ["sales order confirmation", "soc"], table: "scm_sal_main", doc_type: "sal_soc" },
	{ terms: ["sales quotation", "quote", "quo"], table: "scm_sal_main", doc_type: "sal_quo" },
	{ terms: ["sales order", "soe"], table: "scm_sal_main", doc_type: "sal_soe" },
	{ terms: ["delivery order confirmation", "stock doc"], table: "scm_sal_main", doc_type: "stk_doc" },
	{ terms: ["debit note", "dn"], table: "scm_sal_main", doc_type: "sal_dn" },
	{ terms: ["credit note", "cn"], table: "scm_sal_main", doc_type: "sal_cn" },
	{ terms: ["purchase request", "pr"], table: "scm_pur_main", doc_type: "pur_pr" },
	{ terms: ["purchase order", "po"], table: "scm_pur_main", doc_type: "pur_po" },
	{ terms: ["goods received note", "grn"], table: "scm_pur_main", doc_type: "stk_grn" },
	{ terms: ["goods returned voucher", "gvn"], table: "scm_pur_main", doc_type: "stk_gvn" }
]>

<!--- Normalize user message for doc type mapping --->
<cfset userMsg = trim(form.msg ?: url.msg ?: "")>
<cfset userMsgNorm = lcase(reReplace(userMsg, "[^a-z0-9 ]", "", "all"))>
<cfset mappedDocType = "">
<cfset mappedTable = "">
<cfloop array="#docTypeUserMap#" index="mapItem">
	<cfloop array="#mapItem.terms#" index="term">
		<cfif findNoCase(term, userMsgNorm)>
			<cfset mappedDocType = mapItem.doc_type>
			<cfset mappedTable = mapItem.table>
			<cfbreak>
		</cfif>
	</cfloop>
	<cfif len(mappedDocType)><cfbreak></cfif>
</cfloop>

<!--- AI agent: Table selection --->
<cfset tableSelectPrompt =
"You must strictly limit your response to a maximum of 500 tokens." & Chr(10) &
"Given the following schema and a user question, select the most relevant table (and document type if possible)." & Chr(10) & Chr(10) &
"SCHEMA:" & Chr(10) &
schemaSummary & Chr(10) &
"User question: " & form.msg & Chr(10) & Chr(10) &
"Respond in JSON: {""table"": ""table_name"", ""doc_type"": ""doc_type_code""}. If unsure, respond: {""table"": ""unknown""}"
>

<cfset aiTableSelect = callAI(tableSelectPrompt, form.msg)>
<cfset aiTableSelectStruct = safeDeserializeJSON(aiTableSelect, { "table": "unknown" })>

<!--- Improved fallback logic: if AI returns unknown but mapping exists, use mappedTable/mappedDocType --->
<cfif structKeyExists(aiTableSelectStruct, "table") AND aiTableSelectStruct.table NEQ "unknown">
	<cfset relevantTable = aiTableSelectStruct.table>
<cfelseif len(mappedTable) AND len(mappedDocType)>
	<cfset relevantTable = mappedTable>
	<cfset aiTableSelectStruct["doc_type"] = mappedDocType>
	<cfset aiTableSelectStruct["table"] = mappedTable>
<cfelse>
	<!--- Fallback to old logic --->
	<cfset relevantTable = "scm_sal_main">
	<cfif findNoCase("purchase", userMsgLower) OR findNoCase("supplier", userMsgLower)>
		<cfset relevantTable = "scm_pur_main">
	<cfelseif findNoCase("sales", userMsgLower)>
		<cfset relevantTable = "scm_sal_main">
	</cfif>
</cfif>

<cfset tableInfo = schema[relevantTable]>
<cfset columns = tableInfo["columns"]>
<cfset businessRules = tableInfo["business_rules"]>
<cfset schemaPrompt = "Table: " & relevantTable & " (" & tableInfo["description"] & ")\nColumns:\n">
<cfloop collection="#columns#" item="col">
	<cfset schemaPrompt &= "- " & col & ": " & columns[col] & chr(10)>
</cfloop>
<cfset schemaPrompt &= "Business rules:\n">
<cfloop array="#businessRules#" index="rule">
	<cfset schemaPrompt &= "- " & rule & chr(10)>
</cfloop>

<!--- 2. Get user input and chat history --->
<cfset confirmed = trim(form.confirmed ?: url.confirmed ?: "")>
<cfset chatHistoryJson = trim(form.chatHistory ?: url.chatHistory ?: "")>

<!--- Process chat history --->
<cfset historyContext = "">
<cfif len(chatHistoryJson)>
        <cfset chatHistoryArray = safeDeserializeJSON(chatHistoryJson, [])>
        <cfset historyContext = formatHistoryForAI(chatHistoryArray)>
</cfif>

<cfif !len(userMsg)>
	<cfoutput>#serializeJSON({ error = "No question provided." })#</cfoutput><cfabort>
</cfif>

<!--- 3. AGENT 1: INTENT CLASSIFIER --->
<cfset intentPrompt = "
You must strictly limit your response to a maximum of 500 tokens.

#historyContext#

Classify the user's input as:
- 'sql' for data questions, reports, queries, OR follow-up questions about recent DATA RESULTS (actual tables/numbers) that require new or filtered data
- 'use_previous_results' for follow-up, clarification, or summary questions that can be answered directly from the most recent data table or summary in the chat history (e.g., 'who is best?', 'explain row 2', 'what does this mean?', 'show details for row 3', 'which customer bought most?', 'what is the total?')
- 'chat' for greetings, thanks, general talk unrelated to data

IMPORTANT:
- Only classify as 'sql' if the question requires new or filtered data not present in the most recent results.
- Classify as 'use_previous_results' if the answer can be found in the last data table or summary.
- If unsure, prefer 'use_previous_results' over 'sql'.

Examples:
- 'find best salesman' = 'sql' (new data request)
- After showing actual sales data with names/amounts, 'who is best?' = 'use_previous_results' (answer from last table)
- After showing only SQL query (no results), 'who is best?' = 'sql' (still need to run query)
- 'show details for row 2' (after table) = 'use_previous_results'
- 'what is the total?' (after table) = 'use_previous_results'
- 'hello' or 'thanks' = 'chat'
- 'show sales for JEN' (after table for RAMIE) = 'sql' (new filter)
- 'explain this number' (after table) = 'use_previous_results'

User input: #userMsg#
Respond only: sql, use_previous_results, or chat
">
<cfset intentSession = LuceeCreateAISession(name="gpt002", systemMessage=intentPrompt)>
<cfset aiIntent = lcase(trim(LuceeInquiryAISession(intentSession, userMsg)))>

<!--- NEW: AGENT 8: CONTEXT STATE TRACKER --->
<cfset contextState = analyzeConversationContext(historyContext, userMsg)>

<!--- 4. AGENT 2: CHAT AGENT --->
<cfif aiIntent eq "chat">
	<cfset chatPrompt = "
	You must strictly limit your response to a maximum of 500 tokens.
	
	#historyContext#
	
	You are a helpful business assistant. Reply naturally and friendly.
	
	User: #userMsg#
	">
	<cfset chatSession = LuceeCreateAISession(name="gpt002", systemMessage=chatPrompt)>
	<cfset aiReply = LuceeInquiryAISession(chatSession, userMsg)>
	<cfoutput>
		#serializeJSON({
			summary = aiReply,
			sql = "",
			table = "",
			debug = "Intent: chat"
		})#
	</cfoutput>
	<cfabort>
</cfif>

<!--- NEW: AGENT 2b: USE PREVIOUS RESULTS AGENT (for follow-up/clarification) --->
<cfif aiIntent eq "use_previous_results">
	<cfset analysisPrompt = "
	You must strictly limit your response to a maximum of 500 tokens.
	
	#historyContext#
	The user asked: #userMsg#
	Analyze the conversation history above and provide a detailed, context-aware response.
	IMPORTANT RULES:
	1. If asking for 'details' about a specific document (like SIV12417), provide comprehensive invoice information
	2. If asking about dates, provide specific date information with proper formatting
	3. If asking follow-up questions about sales data, provide specific names and amounts
	4. If asking about NULL/empty staff names or data quality, explain what empty records represent
	5. Format numbers with commas (e.g., 72,920,300,000 not 72920300000)
	6. Include currency information when showing amounts
	7. Use bold formatting (**text**) for important information
	8. Use warning emoji (⚠️) for data quality issues
	DATA QUALITY EXPLANATIONS:
	- Empty/NULL staff_desc usually represents: unassigned transactions, system-generated entries, data import errors, or default/generic transactions
	- These should typically be excluded from staff performance analysis
	- Suggest filtering: 'Use filters like staff_desc IS NOT NULL to get meaningful staff performance data'
	Examples of good responses:
	- For 'details?' about invoice: '**Invoice SIV12417 Details:** Staff: **CSC Tender QS3**, Customer: **GENERAL PARTY**, Amount: **0 SGD**, Posted: 2025-04-01, Transaction: 2010-12-31'
	- For 'who is best': 'The best salesman is **RAMIE** with total sales of **72,920,300,000 MYR**'
	- For 'staff_desc is null?': '⚠️ Yes, there are transactions with empty staff names (**68,687,572 SGD**). These likely represent unassigned or system transactions, not actual staff performance. Consider filtering these out for meaningful staff analysis.'
	- For 'top 3': '**Top 3 salesmen:** 1. **RAMIE (72,920,300,000 MYR)** 2. **JEN (44,095,020,000 MYR)** 3. **MOON (37,879,795,000 MYR)**'
	If you cannot find relevant data to answer the question, respond with 'NO_DATA_AVAILABLE'
	">
	<cfset analysisSession = LuceeCreateAISession(name="gpt002", systemMessage=analysisPrompt)>
	<cfset analysisResult = trim(LuceeInquiryAISession(analysisSession, userMsg))>
	<cfif NOT findNoCase("NO_DATA_AVAILABLE", analysisResult)>
		<cfoutput>
			#serializeJSON({
				summary = analysisResult,
				sql = "",
				table = "",
				debug = "Agent 2b (Previous Results Analyzer): Answered from chat history"
			})#
		</cfoutput>
		<cfabort>
	</cfif>
	<!--- If no data available, fall through to normal SQL generation --->
</cfif>

<!--- 5. AGENT 3: SQL GENERATOR --->
<!--- BYPASS: If user confirmed execution, skip SQL generation and use confirmed SQL directly --->

<!--- Normal flow: Agent 3 SQL Generator for new requests --->
<cfset sqlGenPrompt = "
You must strictly limit your response to a maximum of 500 tokens.

#historyContext#

Generate a PostgreSQL SELECT statement for this question.

CONTEXT ANALYSIS:
- Is Follow-up Query: #contextState.isFollowUp#
- Has Recent Data: #contextState.hasRecentData#
- Suggested Action: #contextState.suggestedAction#
- Last Query Type: #contextState.lastQueryType#

CONTEXT-AWARE RULES:
1. If user asks for 'doc no, date trans, amount, staff' and we have specific document context (like SIV12396),
build query specifically for that document with WHERE dnum_auto = 'SIV12396'.
2. If user specifies column order (e.g., 'doc no, date trans, amount, staff'),
return columns in EXACTLY that order using proper aliases.
3. If this is a follow-up to a maximum/minimum query, use that specific record's filters.
4. For follow-up queries about 'which doc' or 'details', use contextual filters from previous results.
5. If the user asks about currency (e.g., mentions SGD, MYR, USD, currency), ALWAYS include curr_short_forex in the SELECT and GROUP BY clauses if grouping.

CURRENT CONTEXT: #structKeyExists(contextState.lastResultContext, "documentNumber") ? contextState.lastResultContext.documentNumber : 'None'#

IMPORTANT: Only respond with 'USE_PREVIOUS_RESULTS' if ALL these conditions are met:
1. The conversation history contains actual DATA TABLES with rows and columns (not just SQL queries)
2. The current question can be answered directly from that specific data
3. The data is recent (from the last few messages)

SPECIAL HANDLING FOR DATA QUALITY QUESTIONS:
- If user asks about NULL/empty staff names, use: WHERE staff_desc IS NULL OR staff_desc = ''
- If user wants to exclude NULL staff, use: WHERE staff_desc IS NOT NULL AND staff_desc != ''
- If user asks about data quality issues, check for empty/null values

Examples of when to use previous results:
- History shows: 'STAFF_DESC: RAMIE, TOTAL_SALES: 481065280000' and user asks 'who is best salesman' → USE_PREVIOUS_RESULTS
- History shows: 'CUSTOMER: ABC Corp, AMOUNT: 50000' and user asks 'which customer bought most' → USE_PREVIOUS_RESULTS

Examples of when to generate NEW SQL:
- User asks 'find best salesman' but no sales data shown yet → Generate SQL
- History only shows SQL queries but no actual results → Generate SQL
- User asks for different type of data than what was shown → Generate SQL
- User asks about NULL/empty data → Generate specific NULL-checking SQL

SCHEMA:
#schemaPrompt#

RULES:
- Always use WHERE tag_deleted_yn = 'n'
- For staff sales queries: Add 'AND staff_desc IS NOT NULL AND staff_desc != ''' (unless specifically asking about nulls)
- Always add LIMIT (10 for listings, 1000 max)
- Never use SELECT *
- Use proper column names
- If context suggests specific document, add WHERE dnum_auto = 'document_number'
- Respect exact column order when user specifies it

Question: #userMsg#

Return ONLY the SQL SELECT statement OR 'USE_PREVIOUS_RESULTS' (only if data tables exist in history).
">
<cfset sqlGenSession = LuceeCreateAISession(name="gpt002", systemMessage=sqlGenPrompt)>
<cfset aiSql = trim(LuceeInquiryAISession(sqlGenSession, userMsg))>

<!--- Check if AI wants to use previous results --->
<cfif findNoCase("USE_PREVIOUS_RESULTS", aiSql)>
	<!--- AGENT 7: PREVIOUS RESULTS ANALYZER --->
	<cfset analysisPrompt = "
	You must strictly limit your response to a maximum of 500 tokens.
	
	#historyContext#
	
	The user asked: #userMsg#
	
	Analyze the conversation history above and provide a detailed, context-aware response.
	
	IMPORTANT RULES:
	1. If asking for 'details' about a specific document (like SIV12417), provide comprehensive invoice information
	2. If asking about dates, provide specific date information with proper formatting
	3. If asking follow-up questions about sales data, provide specific names and amounts
	4. If asking about NULL/empty staff names or data quality, explain what empty records represent
	5. Format numbers with commas (e.g., 72,920,300,000 not 72920300000)
	6. Include currency information when showing amounts
	7. Use bold formatting (**text**) for important information
	8. Use warning emoji (⚠️) for data quality issues
	
	DATA QUALITY EXPLANATIONS:
	- Empty/NULL staff_desc usually represents: unassigned transactions, system-generated entries, data import errors, or default/generic transactions
	- These should typically be excluded from staff performance analysis
	- Suggest filtering: 'Use filters like staff_desc IS NOT NULL to get meaningful staff performance data'
	
	Examples of good responses:
	- For 'details?' about invoice: '**Invoice SIV12417 Details:** Staff: **CSC Tender QS3**, Customer: **GENERAL PARTY**, Amount: **0 SGD**, Posted: 2025-04-01, Transaction: 2010-12-31'
	- For 'who is best': 'The best salesman is **RAMIE** with total sales of **72,920,300,000 MYR**'
	- For 'staff_desc is null?': '⚠️ Yes, there are transactions with empty staff names (**68,687,572 SGD**). These likely represent unassigned or system transactions, not actual staff performance. Consider filtering these out for meaningful staff analysis.'
	- For 'top 3': '**Top 3 salesmen:** 1. **RAMIE (72,920,300,000 MYR)** 2. **JEN (44,095,020,000 MYR)** 3. **MOON (37,879,795,000 MYR)**'
	
	If you cannot find relevant data to answer the question, respond with 'NO_DATA_AVAILABLE'
	">
	
	<cfset analysisSession = LuceeCreateAISession(name="gpt002", systemMessage=analysisPrompt)>
	<cfset analysisResult = trim(LuceeInquiryAISession(analysisSession, userMsg))>
	
	<cfif NOT findNoCase("NO_DATA_AVAILABLE", analysisResult)>
		<!--- Agent 7 found relevant data and provided an answer --->
		<cfoutput>
			#serializeJSON({
				summary = analysisResult,
				sql = "",
				table = "",
				debug = "Agent 7 (Previous Results Analyzer): Answered from chat history"
			})#
		</cfoutput>
		<cfabort>
	<cfelse>
		<!--- Agent 7 says no relevant data available, force new SQL generation --->
		<cfset aiSql = "">
	</cfif>
</cfif>

<!--- Extract SQL for new requests --->
<cfset sqlOut = "">
<cfif refindnocase("^select\s", aiSql)>
	<cfset sqlOut = trim(aiSql)>
<cfelse>
	<cfset sqlMatches = rematchnocase("select\s.+?(?=;|\s*$)", aiSql)>
	<cfif arraylen(sqlMatches) GT 0>
		<cfset sqlOut = trim(sqlMatches[1])>
	</cfif>
</cfif>

<!--- Basic validation with fallback --->
<cfif NOT len(sqlOut) OR NOT refindnocase("^select\s", sqlOut)>
	<cfoutput>#serializeJSON({ error="Could not generate valid SQL. Please rephrase your question more specifically.", debug=aiSql })#</cfoutput><cfabort>
</cfif>

<!--- NEW: AGENT 9 - SQL Validator & Enhancer --->
<cfset validatedSQL = validateAndEnhanceSQL(sqlOut, contextState, userMsg)>
<cfif NOT validatedSQL.isValid>
	<cfset errorsList = arrayLen(validatedSQL.errors) GT 0 ? arrayToList(validatedSQL.errors, "; ") : "Validation failed">
	<cfoutput>
		#serializeJSON({
			error="SQL validation failed: " & errorsList,
			debug="Original SQL: " & sqlOut
		})#
	</cfoutput><cfabort>
</cfif>
<cfset sqlOut = validatedSQL.enhancedSQL>

<!--- NEW: AGENT 16 - SQL Query Validator (User Requirements Check) --->
<cfset sqlValidation = validateSQLAgainstUserQuery(sqlOut, userMsg, contextState)>
<cfif NOT sqlValidation.meetsRequirements>
	<!--- SQL doesn't meet user requirements - regenerate with feedback --->
	<cfset improvedSQL = regenerateSQLWithFeedback(userMsg, sqlOut, sqlValidation.feedback, contextState)>
	<cfif len(improvedSQL.enhancedSQL)>
		<cfset sqlOut = improvedSQL.enhancedSQL>
	<cfelse>
		<cfset issuesList = arrayLen(sqlValidation.issues) GT 0 ? arrayToList(sqlValidation.issues, "; ") : "No specific issues identified">
		<cfoutput>
			#serializeJSON({
				error="Unable to generate SQL that meets your requirements. Please rephrase your question.",
				debug="Original SQL: " & sqlOut & " | Validation Issues: " & issuesList
			})#
		</cfoutput><cfabort>
	</cfif>
</cfif>

<!--- Add LIMIT if missing --->
<cfif NOT refindnocase("limit\s+\d+", sqlOut)>
	<cfset sqlOut = sqlOut & " LIMIT 100">
</cfif>

<!--- FIRST_EDIT: enforce AI-selected doc_type in SQL filter --->
<cfif structKeyExists(aiTableSelectStruct, "doc_type") AND len(aiTableSelectStruct.doc_type)>
	<cfset sqlOut = reReplaceNoCase(sqlOut, "tag_table_usage\s*=\s*'[^']*'", "tag_table_usage = '" & aiTableSelectStruct.doc_type & "'", "one")>
</cfif>

<!--- NEW: Post-SQL-generation required column validation for currency queries --->
<cfset currencyTerms = ["local", "forex", "subtot", "nettot", "total", "amount"]>
<cfset requiresCurrencyCol = false>
<cfloop array="#currencyTerms#" index="cterm">
	<cfif findNoCase(cterm, sqlOut)>
		<cfset requiresCurrencyCol = true>
		<cfbreak>
	</cfif>
</cfloop>
<cfif requiresCurrencyCol>
	<cfset requiredCols = ["curr_short_forex"]>
	<cfset colValidation = validateSQLRequiredColumns(sqlOut, requiredCols)>
	<cfif NOT colValidation.isValid>
		<!--- Attempt to regenerate SQL with missing columns included --->
		<cfset aiRetryPrompt = "You must strictly limit your response to a maximum of 500 tokens.\nThe previous SQL did not include the required column(s): #arrayToList(colValidation.missingColumns, ", ")#.\nPlease regenerate the SQL, making sure to include these columns in the SELECT and GROUP BY clauses.\nUser question: #userMsg#\nPrevious SQL: #sqlOut#\n">
		<cfset aiRetrySession = LuceeCreateAISession(name="gpt002", systemMessage=aiRetryPrompt)>
		<cfset aiRetrySQL = trim(LuceeInquiryAISession(aiRetrySession, userMsg))>
		
		
		<cfset sqlOut = aiRetrySQL>
	</cfif>
</cfif>

<!--- 7. AGENT 4: SQL EXECUTOR --->
<!--- NEW: AGENT 17 - SQL Error Recovery & Auto-Retry System --->
<cfset maxRetryAttempts = 3>
<cfset retryAttempt = 0>
<cfset sqlExecutionSuccess = false>
<cfset lastSQLError = "">
<cfset originalSQL = sqlOut>

<cfloop condition="retryAttempt LT maxRetryAttempts AND NOT sqlExecutionSuccess">
	<cfset retryAttempt++>
	
	<cftry>
		<!--- AGENT 17a: Pre-execution SQL Error Detection & Auto-Fix --->
		<cfset autoFixedSQL = autoFixSQLSyntax(sqlOut, retryAttempt)>
		<cfif autoFixedSQL.wasFixed>
			<cfset sqlOut = autoFixedSQL.correctedSQL>
			<cflog file="sql_auto_fix" text="AGENT 17 AUTO-FIX Attempt #retryAttempt#: #autoFixedSQL.fixDescription# | Original: #originalSQL# | Fixed: #sqlOut#">
		</cfif>
		
		<!--- Attempt SQL execution --->
		<cfquery name="data" datasource="#cookie.cooksql_mainsync#_active" timeout="30">
			#preserveSingleQuotes(sqlOut)#
		</cfquery>
		
		<!--- If we reach here, execution was successful --->
		<cfset sqlExecutionSuccess = true>
		<cfif retryAttempt GT 1>
			<cflog file="sql_auto_fix" text="AGENT 17 SUCCESS: SQL execution succeeded on attempt #retryAttempt# with query: #sqlOut#">
		</cfif>
		
		<cfcatch type="database">
			<cfset lastSQLError = cfcatch.message>
			<cflog file="sql_auto_fix" text="AGENT 17 ERROR Attempt #retryAttempt#: #cfcatch.message# | SQL: #sqlOut#">
			
			<!--- AGENT 17b: Intelligent SQL Error Analysis & Recovery --->
			<cfset errorRecovery = intelligentSQLErrorRecovery(sqlOut, cfcatch.message, userMsg, retryAttempt)>
			
			<cfif errorRecovery.canRecover AND retryAttempt LT maxRetryAttempts>
				<cfset sqlOut = errorRecovery.recoveredSQL>
				<cflog file="sql_auto_fix" text="AGENT 17 RECOVERY Attempt #retryAttempt#: #errorRecovery.recoveryDescription# | New SQL: #sqlOut#">
			<cfelse>
				<!--- Cannot recover, exit loop --->
				<cfbreak>
			</cfif>
		</cfcatch>
	</cftry>
</cfloop>

<!--- Check if SQL execution was successful after all retry attempts --->
<cfif NOT sqlExecutionSuccess>
	<!--- AGENT 17c: Final Recovery - Generate Completely New SQL --->
	<cfset finalRecoveryResult = finalSQLRecovery(userMsg, originalSQL, lastSQLError)>
	
	<cfif finalRecoveryResult.hasAlternative>
		<cftry>
			<cfquery name="data" datasource="#cookie.cooksql_mainsync#_active" timeout="30">
				#preserveSingleQuotes(finalRecoveryResult.alternativeSQL)#
			</cfquery>
			<cfset sqlOut = finalRecoveryResult.alternativeSQL>
			<cfset sqlExecutionSuccess = true>
			<cflog file="sql_auto_fix" text="AGENT 17 FINAL RECOVERY SUCCESS: #finalRecoveryResult.alternativeSQL#">
			<cfcatch>
				<!--- Final attempt failed, return comprehensive error --->
				<cfoutput>
					#serializeJSON({
						error = "AGENT 17 AUTO-RECOVERY FAILED: After #maxRetryAttempts# attempts, could not execute SQL. Final error: " & lastSQLError,
						debug = "Original SQL: " & originalSQL & " | Last attempted SQL: " & sqlOut & " | Recovery attempts: " & retryAttempt,
						autoRecoveryAttempted = true,
						recoverySteps = finalRecoveryResult.recoverySteps,
						timestamp = now()
					})#
				</cfoutput>
				<cfabort>
			</cfcatch>
		</cftry>
	<cfelse>
		<!--- No recovery possible, return detailed error --->
		<cfoutput>
			#serializeJSON({
				error = "SQL execution failed after " & retryAttempt & " auto-recovery attempts. Last error: " & lastSQLError,
				debug = "Original SQL: " & originalSQL & " | Final SQL: " & sqlOut & " | User Query: " & userMsg,
				autoRecoveryAttempted = true,
				recoveryAttemptsUsed = retryAttempt,
				recoverySteps = finalRecoveryResult.recoverySteps
			})#
		</cfoutput>
		<cfabort>
	</cfif>
</cfif>

<!--- Continue with successful execution --->
<cfset queryResultArray = []>
<cfloop query="data">
	<cfset row = {} >
	<cfloop list="#data.columnlist#" index="col">
		<cfset row[col] = data[col][currentRow]>
	</cfloop>
	<cfset arrayAppend(queryResultArray, row)>
</cfloop>

<!--- 8. AGENT 5: DATA SUMMARIZER --->
<cfset summaryText = generateSummary(queryResultArray, userMsg)>

<!--- NEW: AGENT 10: BUSINESS INTELLIGENCE ANALYZER --->
<cfset businessIntelligence = generateBusinessIntelligence(queryResultArray, userMsg, sqlOut)>
<cfset totalsResult = calculateAutoTotals(queryResultArray, userMsg)>
<cfset summaryText = generateProfessionalSummary(queryResultArray, userMsg, businessIntelligence, totalsResult)>

<!--- 9. AGENT 6: TABLE FORMATTER --->
<cfset prettyTable = "">
<cfif arrayLen(queryResultArray)>
	<cfset prettyTable = "<table border='1' cellpadding='5' style='border-collapse:collapse;'><tr>">
	<cfloop array="#structKeyArray(queryResultArray[1])#" index="col">
		<cfset prettyTable &= "<th style='background:##f0f0f0; padding:8px;'>#encodeForHTML(col)#</th>">
	</cfloop>
	<cfset prettyTable &= "</tr>">
	<cfloop array="#queryResultArray#" index="r">
		<cfset prettyTable &= "<tr>">
		<cfloop array="#structKeyArray(r)#" index="col">
			<cfset prettyTable &= "<td style='padding:8px; border:1px solid ##ddd;'>#encodeForHTML(r[col])#</td>" & chr(10)>
		</cfloop>
		<cfset prettyTable &= "</tr>">
	</cfloop>
	<cfset prettyTable &= "</table>">
</cfif>

<!--- NEW: AGENT 18 - Chart Generation & Visualization --->
<cfset chartResult = generateChartVisualization(queryResultArray, userMsg, sqlOut)>

<!--- NEW: AGENT 19 - Auto-Totals & Lump Sum Calculator --->
<cfset totalsResult = calculateAutoTotals(queryResultArray, userMsg)>

<!--- 10. Response --->
<cfset debugColumns = arrayLen(queryResultArray) GT 0 ? structKeyArray(queryResultArray[1]) : []>
<cfset chartHTMLStatus = len(chartResult.chartHTML) GT 0 ? "Chart HTML generated (length: " & len(chartResult.chartHTML) & ")" : "No chart HTML generated">
<cfset debugTableSelect = {
	prompt = tableSelectPrompt,
	aiResponse = aiTableSelect,
	aiTableSelectStruct = aiTableSelectStruct
}>

// FIRST_EDIT: add structured debug object
<cfset debugStruct = {
    sqlExecution = { executed = true, recordCount = arrayLen(queryResultArray) },
    contextState = contextState,
    businessIntelligenceDebug = structKeyExists(businessIntelligence, "debugInfo") ? businessIntelligence.debugInfo : {},
    fieldMappingInfo = structKeyExists(businessIntelligence, "fieldMappingInfo") ? businessIntelligence.fieldMappingInfo : {},
    chart = { generated = len(chartResult.chartHTML) GT 0, status = chartHTMLStatus },
    totals = totalsResult,
    tableSelect = debugTableSelect,
    columns = debugColumns
}>

<cfoutput>
	#serializeJSON({
		summary = summaryText,
		sql = sqlOut,
		table = prettyTable,
		chart = chartResult.chartHTML,
		chartConfig = chartResult.chartConfig,
		chartRecommendation = chartResult.recommendation,
		totals = totalsResult,
		rowCount = arrayLen(queryResultArray),
		// SECOND_EDIT: replace debug and related fields with debugStruct
		debug = debugStruct
	})#
</cfoutput>

<!--- NEW: AGENT 17 Helper Functions for SQL Error Recovery & Auto-Retry System --->

<!--- AGENT 17a: Pre-execution SQL Syntax Auto-Fix --->
<cffunction name="autoFixSQLSyntax" returntype="struct" access="private">
	<cfargument name="sql" type="string" required="true">
	<cfargument name="attemptNumber" type="numeric" required="true">
	
	<cfset result = {
		"wasFixed": false,
		"correctedSQL": arguments.sql,
		"fixDescription": "No fixes applied"
	}>
	
	<cfset originalSQL = arguments.sql>
	<cfset fixedSQL = originalSQL>
	<cfset fixes = []>
	
	<!--- Fix 1: Remove duplicate LIMIT clauses --->
	<cfif findNoCase("LIMIT LIMIT", fixedSQL)>
		<cfset fixedSQL = replace(fixedSQL, "LIMIT LIMIT", "LIMIT", "ALL")>
		<cfset arrayAppend(fixes, "Removed duplicate LIMIT clause")>
	</cfif>
	
	<!--- Fix 2: Fix malformed LIMIT at beginning --->
	<cfif refindnocase("^LIMIT\s+\d+", trim(fixedSQL))>
		<cfset fixedSQL = "SELECT * FROM scm_sal_main WHERE tag_deleted_yn = 'n' " & fixedSQL>
		<cfset arrayAppend(fixes, "Added SELECT statement before orphaned LIMIT")>
	</cfif>
	
	<!--- Fix 3: Remove stray semicolons in middle of query --->
	<cfset fixedSQL = reReplace(fixedSQL, ";\s*(?!$)", " ", "ALL")>
	<cfif fixedSQL NEQ originalSQL AND NOT arrayContains(fixes, "Removed duplicate LIMIT clause")>
		<cfset arrayAppend(fixes, "Removed stray semicolons")>
	</cfif>
	
	<!--- Fix 4: Fix incomplete WHERE clauses --->
	<cfif findNoCase("WHERE AND", fixedSQL)>
		<cfset fixedSQL = replace(fixedSQL, "WHERE AND", "WHERE", "ALL")>
		<cfset arrayAppend(fixes, "Fixed incomplete WHERE clause")>
	</cfif>
	
	<!--- Fix 5: Add missing quotes around string values --->
	<cfif findNoCase("= sal_inv", fixedSQL) AND NOT findNoCase("= 'sal_inv'", fixedSQL)>
		<cfset fixedSQL = replace(fixedSQL, "= sal_inv", "= 'sal_inv'", "ALL")>
		<cfset arrayAppend(fixes, "Added quotes around string values")>
	</cfif>
	
	<!--- Fix 6: Attempt-specific progressive fixes --->
	<cfif arguments.attemptNumber EQ 2>
		<!--- Second attempt: More aggressive fixes --->
		<cfif NOT findNoCase("WHERE", fixedSQL) AND findNoCase("SELECT", fixedSQL)>
			<!--- Add basic WHERE clause if missing --->
			<cfset fromPos = findNoCase(" FROM ", fixedSQL)>
			<cfif fromPos GT 0>
				<cfset beforeLimit = findNoCase(" LIMIT", fixedSQL)>
				<cfif beforeLimit GT 0>
					<cfset beforeLimitStr = mid(fixedSQL, 1, beforeLimit - 1)>
					<cfset afterLimit = mid(fixedSQL, beforeLimit, len(fixedSQL))>
					<cfset fixedSQL = beforeLimitStr & " WHERE tag_deleted_yn = 'n'" & afterLimit>
				<cfelse>
					<cfset fixedSQL = fixedSQL & " WHERE tag_deleted_yn = 'n'">
				</cfif>
				<cfset arrayAppend(fixes, "Added missing WHERE clause")>
			</cfif>
		</cfif>
	</cfif>
	
	<cfif arguments.attemptNumber EQ 3>
		<!--- Third attempt: Complete reconstruction --->
		<cfif NOT refindnocase("^SELECT\s", trim(fixedSQL))>
			<cfset fixedSQL = "SELECT dnum_auto, date_trans, nettot_forex, staff_desc, curr_short_forex FROM scm_sal_main WHERE tag_deleted_yn = 'n' AND tag_table_usage = 'sal_inv' LIMIT 10">
			<cfset arrayAppend(fixes, "Complete SQL reconstruction")>
		</cfif>
	</cfif>
	
	<!--- Check if any fixes were applied --->
	<cfif fixedSQL NEQ originalSQL>
		<cfset result.wasFixed = true>
		<cfset result.correctedSQL = fixedSQL>
		<cfset result.fixDescription = arrayToList(fixes, "; ")>
	</cfif>
	
	<cfreturn result>
</cffunction>

<!--- Helper to call the AI model with a prompt and question --->
<cffunction name="callAI" access="private" returntype="string">
    <cfargument name="prompt" type="string" required="true">
    <cfargument name="question" type="string" required="true">

    <cfset var session = LuceeCreateAISession(name="gpt002", systemMessage=arguments.prompt)>
    <cfset var response = LuceeInquiryAISession(session, arguments.question)>
    <cfreturn trim(response)>
</cffunction>

<!--- Safely deserialize JSON with a default fallback --->
<cffunction name="safeDeserializeJSON" access="private" returntype="any">
    <cfargument name="text" type="string" required="true">
    <cfargument name="default" type="any" required="false" default="#structNew()#">

    <cfset var obj = arguments.default>
    <cftry>
        <cfset obj = deserializeJSON(arguments.text)>
        <cfcatch>
            <cfset obj = arguments.default>
        </cfcatch>
    </cftry>
    <cfreturn obj>
</cffunction>

<!--- AGENT 17b: Intelligent SQL Error Analysis & Recovery --->
<cffunction name="intelligentSQLErrorRecovery" returntype="struct" access="private">
	<cfargument name="sql" type="string" required="true">
	<cfargument name="errorMessage" type="string" required="true">
	<cfargument name="userQuery" type="string" required="true">
	<cfargument name="attemptNumber" type="numeric" required="true">
	
	<cfset result = {
		"canRecover": false,
		"recoveredSQL": arguments.sql,
		"recoveryDescription": "No recovery possible"
	}>
	
	<!--- AI-driven SQL error recovery as first step --->
	<cfset aiRecovery = aiSqlErrorRecoveryAgent(arguments.sql, arguments.errorMessage, arguments.userQuery, schema)>
	<cfif structKeyExists(aiRecovery, "canRecover") AND aiRecovery.canRecover>
		<cfset result = aiRecovery>
		<cfreturn result>
	</cfif>
	
	<!--- Fallback to old pattern-based logic if AI cannot help --->
	<cfset errorLower = lcase(arguments.errorMessage)>
	<cfset recoveredSQL = arguments.sql>
	<!--- (rest of the original pattern-based logic follows as before) --->
	<!--- Error Pattern 1: Syntax error at or near "LIMIT" --->
	<cfif findNoCase("syntax error at or near LIMIT", errorLower)>
		<cfif findNoCase("Position: 2", arguments.errorMessage)>
			<!--- LIMIT is at the beginning - completely malformed SQL --->
			<cfset recoveredSQL = regenerateBasicSQL(arguments.userQuery)>
			<cfset result.canRecover = true>
			<cfset result.recoveryDescription = "Regenerated SQL due to malformed LIMIT at position 2">
		<cfelse>
			<!--- Fix LIMIT syntax issues --->
			<cfset recoveredSQL = fixLimitSyntax(arguments.sql)>
			<cfset result.canRecover = true>
			<cfset result.recoveryDescription = "Fixed LIMIT syntax error">
		</cfif>
	</cfif>
	<!--- Error Pattern 2: Column does not exist --->
	<cfif findNoCase("column", errorLower) AND findNoCase("does not exist", errorLower)>
		<cfset recoveredSQL = fixColumnReferences(arguments.sql, arguments.errorMessage)>
		<cfset result.canRecover = true>
		<cfset result.recoveryDescription = "Fixed invalid column references">
	</cfif>
	<!--- Error Pattern 3: Invalid identifier --->
	<cfif findNoCase("invalid identifier", errorLower) OR findNoCase("identifier must be declared", errorLower)>
		<cfset recoveredSQL = fixIdentifiers(arguments.sql)>
		<cfset result.canRecover = true>
		<cfset result.recoveryDescription = "Fixed invalid identifiers">
	</cfif>
	<!--- Error Pattern 4: Incomplete query structure --->
	<cfif findNoCase("unexpected end", errorLower) OR findNoCase("incomplete", errorLower)>
		<cfset recoveredSQL = completeQuery(arguments.sql, arguments.userQuery)>
		<cfset result.canRecover = true>
		<cfset result.recoveryDescription = "Completed incomplete query structure">
	</cfif>
	<!--- Error Pattern 5: Generic syntax errors - progressive recovery --->
	<cfif findNoCase("syntax error", errorLower) AND result.canRecover EQ false>
		<cfif arguments.attemptNumber EQ 1>
			<cfset recoveredSQL = fixBasicSyntax(arguments.sql)>
			<cfset result.canRecover = true>
			<cfset result.recoveryDescription = "Applied basic syntax fixes">
		<cfelseif arguments.attemptNumber EQ 2>
			<cfset recoveredSQL = regenerateBasicSQL(arguments.userQuery)>
			<cfset result.canRecover = true>
			<cfset result.recoveryDescription = "Regenerated basic SQL structure">
		</cfif>
	</cfif>
	<cfset result.recoveredSQL = recoveredSQL>
	<cfreturn result>
</cffunction>

<!--- AGENT 17c: Final Recovery - Generate Completely New SQL --->
<cffunction name="finalSQLRecovery" returntype="struct" access="private">
	<cfargument name="userQuery" type="string" required="true">
	<cfargument name="originalSQL" type="string" required="true">
	<cfargument name="lastError" type="string" required="true">
	
	<cfset result = {
		"hasAlternative": false,
		"alternativeSQL": "",
		"recoverySteps": []
	}>
	
	<cfset arrayAppend(result.recoverySteps, "Attempt 1: Auto-fix syntax issues")>
	<cfset arrayAppend(result.recoverySteps, "Attempt 2: Intelligent error analysis")>
	<cfset arrayAppend(result.recoverySteps, "Attempt 3: Progressive fixes")>
	<cfset arrayAppend(result.recoverySteps, "Final: Generate new SQL using AI")>
	
	<!--- Use AI to generate completely new SQL based on user query --->
	<cfset emergencyPrompt = "
	You must strictly limit your response to a maximum of 500 tokens.
	
	EMERGENCY SQL RECOVERY: The previous SQL attempts failed. Generate a simple, working PostgreSQL SELECT statement.
	
	User asked: #arguments.userQuery#
	Previous failed SQL: #arguments.originalSQL#
	Last error: #arguments.lastError#
	
	Generate a SIMPLE, BASIC query that answers the user's question:
	
	Rules:
	- Use ONLY these fields: dnum_auto, date_trans, nettot_forex, staff_desc, curr_short_forex
	- Always include: WHERE tag_deleted_yn = 'n'
	- For 2010 data: Add AND EXTRACT(YEAR FROM date_trans) = 2010
	- For sales invoices: Add AND tag_table_usage = 'sal_inv'
	- For totals: Use SUM(nettot_forex)
	- Always end with LIMIT 10
	
	Example working query:
	SELECT dnum_auto, staff_desc, nettot_forex, curr_short_forex FROM scm_sal_main WHERE tag_deleted_yn = 'n' AND tag_table_usage = 'sal_inv' LIMIT 10
	
	Return ONLY the SQL statement.
	">
	
	<cftry>
		<cfset emergencySession = LuceeCreateAISession(name="gpt002", systemMessage=emergencyPrompt)>
		<cfset emergencySQL = trim(LuceeInquiryAISession(emergencySession, arguments.userQuery))>
		
		<!--- Validate and clean the emergency SQL --->
		<cfif refindnocase("^select\s", emergencySQL)>
			<cfset result.hasAlternative = true>
			<cfset result.alternativeSQL = emergencySQL>
			<cfset arrayAppend(result.recoverySteps, "SUCCESS: Generated emergency SQL via AI")>
		<cfelse>
			<!--- AI failed, use hardcoded fallback --->
			<cfset result.hasAlternative = true>
			<cfset result.alternativeSQL = generateHardcodedFallback(arguments.userQuery)>
			<cfset arrayAppend(result.recoverySteps, "FALLBACK: Used hardcoded emergency SQL")>
		</cfif>
		
		<cfcatch>
			<!--- AI completely failed, use hardcoded fallback --->
			<cfset result.hasAlternative = true>
			<cfset result.alternativeSQL = generateHardcodedFallback(arguments.userQuery)>
			<cfset arrayAppend(result.recoverySteps, "EMERGENCY FALLBACK: AI failed, used hardcoded SQL")>
		</cfcatch>
	</cftry>
	
	<cfreturn result>
</cffunction>

<!--- Helper Recovery Functions --->

<cffunction name="fixLimitSyntax" returntype="string" access="private">
	<cfargument name="sql" type="string" required="true">
	
	<cfset fixedSQL = arguments.sql>
	
	<!--- Remove duplicate LIMIT clauses --->
	<cfset fixedSQL = reReplaceNoCase(fixedSQL, "LIMIT\s+LIMIT\s+(\d+)", "LIMIT \1", "ALL")>
	
	<!--- Fix LIMIT without number --->
	<cfset fixedSQL = reReplaceNoCase(fixedSQL, "LIMIT\s*$", "LIMIT 10", "ALL")>
	
	<!--- Fix LIMIT with extra spaces --->
	<cfset fixedSQL = reReplaceNoCase(fixedSQL, "LIMIT\s+(\d+)\s+(\d+)", "LIMIT \1", "ALL")>
	
	<cfreturn fixedSQL>
</cffunction>

<cffunction name="fixColumnReferences" returntype="string" access="private">
	<cfargument name="sql" type="string" required="true">
	<cfargument name="errorMessage" type="string" required="true">
	
	<cfset fixedSQL = arguments.sql>
	
	<!--- Extract column name from error message --->
	<cfset columnMatches = reMatch('"([^"]+)"', arguments.errorMessage)>
	<cfif arrayLen(columnMatches) GT 0>
		<cfset badColumn = replace(columnMatches[1], '"', '', 'ALL')>
		
		<!--- Common column name fixes --->
		<cfswitch expression="#lcase(badColumn)#">
			<cfcase value="total_sales">
				<cfset fixedSQL = replace(fixedSQL, badColumn, "nettot_forex", "ALL")>
			</cfcase>
			<cfcase value="amount">
				<cfset fixedSQL = replace(fixedSQL, badColumn, "nettot_forex", "ALL")>
			</cfcase>
			<cfcase value="staff">
				<cfset fixedSQL = replace(fixedSQL, badColumn, "staff_desc", "ALL")>
			</cfcase>
			<cfcase value="currency">
				<cfset fixedSQL = replace(fixedSQL, badColumn, "curr_short_forex", "ALL")>
			</cfcase>
			<cfdefaultcase>
				<!--- Remove the problematic column entirely --->
				<cfset fixedSQL = reReplace(fixedSQL, badColumn & "\s*,?", "", "ALL")>
			</cfdefaultcase>
		</cfswitch>
	</cfif>
	
	<cfreturn fixedSQL>
</cffunction>

<cffunction name="fixIdentifiers" returntype="string" access="private">
	<cfargument name="sql" type="string" required="true">
	
	<cfset fixedSQL = arguments.sql>
	
	<!--- Fix common identifier issues --->
	<cfset fixedSQL = reReplaceNoCase(fixedSQL, "([a-zA-Z_]+)\.([a-zA-Z_]+)", "\2", "ALL")>  <!--- Remove table prefixes --->
	<cfset fixedSQL = replace(fixedSQL, "[", "", "ALL")>  <!--- Remove square brackets --->
	<cfset fixedSQL = replace(fixedSQL, "]", "", "ALL")>
	
	<cfreturn fixedSQL>
</cffunction>

<cffunction name="completeQuery" returntype="string" access="private">
	<cfargument name="sql" type="string" required="true">
	<cfargument name="userQuery" type="string" required="true">
	
	<cfset fixedSQL = arguments.sql>
	
	<!--- Ensure query has basic structure --->
	<cfif NOT findNoCase("FROM", fixedSQL)>
		<cfset fixedSQL = fixedSQL & " FROM scm_sal_main">
	</cfif>
	
	<cfif NOT findNoCase("WHERE", fixedSQL)>
		<cfset fixedSQL = fixedSQL & " WHERE tag_deleted_yn = 'n'">
	</cfif>
	
	<cfif NOT findNoCase("LIMIT", fixedSQL)>
		<cfset fixedSQL = fixedSQL & " LIMIT 10">
	</cfif>
	
	<cfreturn fixedSQL>
</cffunction>

<cffunction name="fixBasicSyntax" returntype="string" access="private">
	<cfargument name="sql" type="string" required="true">
	
	<cfset fixedSQL = trim(arguments.sql)>
	
	<!--- Remove leading/trailing semicolons --->
	<cfset fixedSQL = reReplace(fixedSQL, "^;+|;+$", "", "ALL")>
	
	<!--- Fix multiple spaces --->
	<cfset fixedSQL = reReplace(fixedSQL, "\s+", " ", "ALL")>
	
	<!--- Ensure proper comma spacing --->
	<cfset fixedSQL = reReplace(fixedSQL, "\s*,\s*", ", ", "ALL")>
	
	<cfreturn fixedSQL>
</cffunction>

<cffunction name="regenerateBasicSQL" returntype="string" access="private">
	<cfargument name="userQuery" type="string" required="true">
	
	<cfset queryLower = lcase(arguments.userQuery)>
	<cfset basicSQL = "">
	
	<!--- Generate basic SQL based on user intent --->
	<cfif findNoCase("total", queryLower) AND findNoCase("sales", queryLower)>
		<cfset basicSQL = "SELECT SUM(nettot_forex) as total_sales, curr_short_forex FROM scm_sal_main WHERE tag_deleted_yn = 'n' AND tag_table_usage = 'sal_inv'">
	<cfelseif findNoCase("2010", queryLower) AND findNoCase("sal_inv", queryLower)>
		<cfset basicSQL = "SELECT dnum_auto, staff_desc, nettot_forex, curr_short_forex, date_trans FROM scm_sal_main WHERE tag_deleted_yn = 'n' AND tag_table_usage = 'sal_inv' AND EXTRACT(YEAR FROM date_trans) = 2010">
	<cfelse>
		<cfset basicSQL = "SELECT dnum_auto, staff_desc, nettot_forex, curr_short_forex FROM scm_sal_main WHERE tag_deleted_yn = 'n' AND tag_table_usage = 'sal_inv'">
	</cfif>
	
	<!--- Add GROUP BY for SUM queries --->
	<cfif findNoCase("SUM(", basicSQL) AND NOT findNoCase("GROUP BY", basicSQL)>
		<cfset basicSQL = basicSQL & " GROUP BY curr_short_forex">
	</cfif>
	
	<!--- Always add LIMIT --->
	<cfset basicSQL = basicSQL & " LIMIT 10">
	
	<cfreturn basicSQL>
</cffunction>

<cffunction name="generateHardcodedFallback" returntype="string" access="private">
	<cfargument name="userQuery" type="string" required="true">
	
	<!--- Ultra-safe hardcoded fallback SQL --->
	<cfreturn "SELECT dnum_auto AS doc_no, staff_desc AS staff, nettot_forex AS amount, curr_short_forex AS currency, date_trans FROM scm_sal_main WHERE tag_deleted_yn = 'n' AND tag_table_usage = 'sal_inv' AND EXTRACT(YEAR FROM date_trans) = 2010 LIMIT 10">
</cffunction>

<!--- Helper Functions --->
<cffunction name="formatHistoryForAI" returntype="string" access="private">
	<cfargument name="historyArray" type="array" required="true">
	
	<cfset historyContext = "">
	<cfloop array="#arguments.historyArray#" index="historyItem">
		<cfset historyContext = historyContext & historyItem & Chr(10)>
	</cfloop>
	
	<cfreturn historyContext>
</cffunction>

<cffunction name="analyzeConversationContext" returntype="struct" access="private">
	<cfargument name="historyContext" type="string" required="true">
	<cfargument name="userMsg" type="string" required="true">
	
	<cfset result = {
		"isFollowUp": false,
		"hasRecentData": false,
		"suggestedAction": "",
		"lastQueryType": "",
		"lastResultContext": {}
	}>
	
	<!--- Implement logic to analyze conversation context --->
	
	<cfreturn result>
</cffunction>

<cffunction name="validateAndEnhanceSQL" returntype="struct" access="private">
	<cfargument name="sql" type="string" required="true">
	<cfargument name="contextState" type="struct" required="true">
	<cfargument name="userMsg" type="string" required="true">
	
	<cfset result = {
		"isValid": false,
		"enhancedSQL": "",
		"errors": []
	}>
	
	<!--- Basic SQL validation --->
	<cfif NOT refindnocase("^select\s", trim(arguments.sql))>
		<cfset arrayAppend(result.errors, "SQL must start with SELECT")>
		<cfset result.enhancedSQL = arguments.sql>
		<cfreturn result>
	</cfif>
	
	<!--- Check for required components --->
	<cfif NOT findNoCase("FROM", arguments.sql)>
		<cfset arrayAppend(result.errors, "SQL missing FROM clause")>
	</cfif>
	
	<!--- Enhance SQL with required filters --->
	<cfset enhancedSQL = arguments.sql>
	
	<!--- Ensure tag_deleted_yn filter exists --->
	<cfif NOT findNoCase("tag_deleted_yn", enhancedSQL)>
		<cfif findNoCase("WHERE", enhancedSQL)>
			<cfset enhancedSQL = replace(enhancedSQL, "WHERE", "WHERE tag_deleted_yn = 'n' AND", "ONE")>
		<cfelse>
			<cfset enhancedSQL = enhancedSQL & " WHERE tag_deleted_yn = 'n'">
		</cfif>
	</cfif>
	
	<!--- Add LIMIT if missing --->
	<cfif NOT refindnocase("limit\s+\d+", enhancedSQL)>
		<cfset enhancedSQL = enhancedSQL & " LIMIT 100">
	</cfif>
	
	<cfset result.isValid = arrayLen(result.errors) EQ 0>
	<cfset result.enhancedSQL = enhancedSQL>
	<cfreturn result>
</cffunction>

<cffunction name="validateSQLAgainstUserQuery" returntype="struct" access="private">
	<cfargument name="sql" type="string" required="true">
	<cfargument name="userMsg" type="string" required="true">
	<cfargument name="contextState" type="struct" required="true">
	
	<cfset result = {
		"meetsRequirements": false,
		"feedback": "",
		"issues": []
	}>
	
	<!--- Basic validation - assume it meets requirements for now --->
	<!--- In a more advanced system, this would analyze if the SQL matches user intent --->
	<cfset result.meetsRequirements = true>
	<cfset result.feedback = "SQL appears to match user requirements">
	
	<cfreturn result>
</cffunction>

<cffunction name="regenerateSQLWithFeedback" returntype="struct" access="private">
	<cfargument name="userMsg" type="string" required="true">
	<cfargument name="sql" type="string" required="true">
	<cfargument name="feedback" type="string" required="true">
	<cfargument name="contextState" type="struct" required="true">
	
	<cfset result = {
		"enhancedSQL": "",
		"errors": []
	}>
	
	<!--- For now, return the original SQL --->
	<!--- In a more advanced system, this would use AI to regenerate based on feedback --->
	<cfset result.enhancedSQL = arguments.sql>
	
	<cfreturn result>
</cffunction>

<cffunction name="generateSummary" returntype="string" access="private">
	<cfargument name="queryResultArray" type="array" required="true">
	<cfargument name="userMsg" type="string" required="true">
	
	<cfset summaryText = "">
	
	<!--- Generate basic summary --->
	<cfif arrayLen(arguments.queryResultArray) EQ 0>
		<cfset summaryText = "No records found matching your criteria.">
	<cfelse>
		<cfset recordCount = arrayLen(arguments.queryResultArray)>
		<cfset summaryText = "Found " & recordCount & " record" & (recordCount NEQ 1 ? "s" : "") & " matching your query.">
	</cfif>
	
	<cfreturn summaryText>
</cffunction>

<cffunction name="generateBusinessIntelligence" returntype="struct" access="private">
	<cfargument name="queryResultArray" type="array" required="true">
	<cfargument name="userMsg" type="string" required="true">
	<cfargument name="sql" type="string" required="true">
	
	<cfset businessIntelligence = {
		"debugInfo": {
			"resultDataStructure": arrayLen(arguments.queryResultArray) GT 0 ? structKeyArray(arguments.queryResultArray[1]) : [],
			"recordCount": arrayLen(arguments.queryResultArray)
		},
		"fieldMappingInfo": {
			"confidence": "High"
		}
	}>
	
	<cfreturn businessIntelligence>
</cffunction>

<!--- AI Agent: Summary Generation --->
<cffunction name="aiSummaryAgent" access="private" returntype="string">
	<cfargument name="userMsg" type="string" required="true">
	<cfargument name="columns" type="array" required="true">
	<cfargument name="sampleRows" type="array" required="true">
	<cfargument name="grandTotalFormatted" type="string" required="false" default="">
	<cfargument name="totalRecords" type="numeric" required="false" default="0">
	
	<cfset var prompt = "You must strictly limit your response to a maximum of 500 tokens. You are a business data analyst. Given the following user question, column names, a sample of the data (top 10 rows), the backend-calculated grand total, and the total record count, generate a concise, natural-language summary for a business user.\n\nRules:\n- For any total or grand total, ALWAYS use this value: " & arguments.grandTotalFormatted & "\n- For total record count, ALWAYS use this value: " & arguments.totalRecords & "\n- List the top 10 clients/groups with their values.\n- Highlight the top client/group and any interesting patterns.\n- Use Markdown for bold/italic and numbers with commas.\n- If the data is grouped (e.g., by client, staff), mention the top group and its value.\n- If the list is partial, say 'Top 10 shown out of " & arguments.totalRecords & "'.\n\nUser question: " & arguments.userMsg & "\nColumns: " & serializeJSON(arguments.columns) & "\nSample data: " & serializeJSON(arguments.sampleRows) & "\nGrand total: " & arguments.grandTotalFormatted & "\nTotal records: " & arguments.totalRecords & "\n\nSummary:" >
	<cfset var aiSummarySession = LuceeCreateAISession(name="gpt002", systemMessage=prompt)>
	<cfset var aiResponse = LuceeInquiryAISession(aiSummarySession, arguments.userMsg)>
	<cfreturn trim(aiResponse)>
</cffunction>

<cffunction name="generateProfessionalSummary" returntype="string" access="private">
	<cfargument name="queryResultArray" type="array" required="true">
	<cfargument name="userMsg" type="string" required="true">
	<cfargument name="businessIntelligence" type="struct" required="true">
	<cfargument name="totalsResult" type="struct" required="false" default="#structNew()#">

	<cfset var summaryText = "">
	<cfset var recordCount = arrayLen(arguments.queryResultArray)>
	<cfset var totalRecords = structKeyExists(arguments.totalsResult, "totalRecords") ? arguments.totalsResult.totalRecords : recordCount>
	<cfset var grandTotalFormatted = structKeyExists(arguments.totalsResult, "grandTotalFormatted") ? arguments.totalsResult.grandTotalFormatted : "">
	<cfset var sampleRows = arraySlice(arguments.queryResultArray, 1, min(10, recordCount))>
	<cfset var columns = []>
	<cfif recordCount>
		<cfset columns = structKeyArray(arguments.queryResultArray[1])>
	</cfif>
	
	<cftry>
		<!--- If no data, simple message --->
		<cfif recordCount EQ 0>
			<cfset summaryText = "No records found matching your criteria. Please try adjusting your search parameters.">
		<cfelse>
			<!--- Prepare prompt data --->
			<cfset aiSystemMsg = "
You are a Business Data Summary Agent.
Summarize the provided business data as a readable, professional report for end users.
Use HTML format.
Strictly keep your response under 500 tokens.
Strictly use S$ for SGD, $ for USD else use Currency Code(MYR, CNY, TWD...) will do..
If data is too long, only summarize the most relevant parts.
">
			<cfset aiUserPrompt = "
User Request: #arguments.userMsg#
Business Intelligence Context: #serializeJSON(arguments.businessIntelligence)#
Summary Totals: #serializeJSON(arguments.totalsResult)#
Sample Data (up to 10 rows): #serializeJSON(sampleRows)#
Grand Total: #grandTotalFormatted#
Total Records: #totalRecords#
">

			<cfset aiSession = LuceeCreateAISession(
				name='gpt002', 
				systemMessage=aiSystemMsg
			)>
			<cfset aiResult = trim(LuceeInquiryAISession(aiSession, aiUserPrompt))>
			<!--- Use result or fallback if blank --->
			<cfif len(aiResult)>
				<cfset summaryText = aiResult>
			<cfelse>
				<cfset summaryText = "Summary could not be generated.">
			</cfif>
		</cfif>
		<cfcatch>
			<cfset summaryText = "Summary could not be generated due to an internal error.">
		</cfcatch>
	</cftry>

	<cfreturn summaryText>
</cffunction>


<cffunction name="callChartAIAgent" access="private" returntype="struct">
	<cfargument name="userMsg" type="string" required="true">
	<cfargument name="columns" type="array" required="true">
	<cfargument name="sampleRows" type="array" required="false" default="#[]#">
	
	<cfscript>
		prompt = "
		You must strictly limit your response to a maximum of 500 tokens.
		
		You are a data visualization expert. Given a user's question, a list of result columns, and a sample of the data, recommend the most suitable chart configuration for display.
		
		If the data is not suitable for a chart (e.g., only one row, or all values are the same, or no meaningful numeric columns), respond with type: 'none' and a recommendation.
		
		Respond in JSON with:
		- type: (bar, line, pie, none, etc.)
		- labelColumn: (the column to use for labels, or '' if none)
		- valueColumn: (the column to use for values, or '' if none)
		- title: (a short chart title)
		- recommendation: (a one-line explanation)
		- confidence: (0.0 to 1.0, how sure you are this is the best chart)
		
		User question: {{userMsg}}
		Result columns: {{columns}}
		Sample data: {{sampleRows}}
		
		Example 1:
		{
			""type"": ""bar"",
			""labelColumn"": ""staff_desc"",
			""valueColumn"": ""nettot_forex"",
			""title"": ""Sales by Staff"",
			""recommendation"": ""Bar chart showing sales performance by staff member"",
			""confidence"": 0.95
		}
		
		Example 2 (no chart):
		{
			""type"": ""none"",
			""labelColumn"": """",
			""valueColumn"": """",
			""title"": ""No Chart"",
			""recommendation"": ""Data is not suitable for chart visualization (e.g., only one row or no numeric columns)."",
			""confidence"": 1.0
		}
		
		Example 3:
		{
			""type"": ""pie"",
			""labelColumn"": ""currency"",
			""valueColumn"": ""total_sales"",
			""title"": ""Sales by Currency"",
			""recommendation"": ""Pie chart showing sales distribution by currency"",
			""confidence"": 0.9
		}
		
		User question: #arguments.userMsg#
		Result columns: #serializeJSON(arguments.columns)#
		Sample data: #serializeJSON(arguments.sampleRows)#
		";
	</cfscript>
	
        <cfset aiResponse = callAI(prompt, arguments.userMsg)>
        <cfset chartConfig = safeDeserializeJSON(aiResponse, { "confidence": 0.0, "error": "Failed to parse AI response", "raw": aiResponse })>
	
	<!--- Strict validation of AI output --->
	<cfset validTypes = ["bar","line","pie","none"]>
	<cfset chartConfigValid = true>
	<cfset validationErrors = []>
	<cfif NOT structKeyExists(chartConfig, "type") OR arrayFindNoCase(validTypes, chartConfig.type) EQ 0>
		<cfset chartConfigValid = false>
		<cfset arrayAppend(validationErrors, "Invalid or missing type")>
	</cfif>
	<cfif chartConfig.type NEQ "none">
		<cfif NOT structKeyExists(chartConfig, "labelColumn") OR arrayFindNoCase(arguments.columns, chartConfig.labelColumn) EQ 0>
			<cfset chartConfigValid = false>
			<cfset arrayAppend(validationErrors, "labelColumn not found in columns")>
		</cfif>
		<cfif NOT structKeyExists(chartConfig, "valueColumn") OR arrayFindNoCase(arguments.columns, chartConfig.valueColumn) EQ 0>
			<cfset chartConfigValid = false>
			<cfset arrayAppend(validationErrors, "valueColumn not found in columns")>
		</cfif>
	</cfif>
	<cfif NOT chartConfigValid>
		<cfset chartConfig.confidence = 0.0>
		<cfset chartConfig.validationError = arrayToList(validationErrors, "; ")>
	</cfif>
	<cfreturn chartConfig>
</cffunction>

<cffunction name="generateChartVisualization" returntype="struct" access="private">
	<cfargument name="queryResultArray" type="array" required="true">
	<cfargument name="userMsg" type="string" required="true">
	<cfargument name="sql" type="string" required="true">
	
	<cfset result = {
		"chartHTML": "",
		"chartConfig": structNew(),
		"recommendation": ""
	}>
	
	<!--- Configurable confidence threshold --->
	<cfset aiChartConfidenceThreshold = 0.7>
	
	<!--- Skip chart generation if no data or too few records --->
	<cfif arrayLen(arguments.queryResultArray) LT 2>
		<cfset result.recommendation = "Insufficient data for chart visualization">
		<cfreturn result>
	</cfif>
	
	<cfset firstRow = arguments.queryResultArray[1]>
	<cfset columns = structKeyArray(firstRow)>
	<cfset aiChartConfig = callChartAIAgent(arguments.userMsg, columns, arraySlice(arguments.queryResultArray, 1, min(3, arrayLen(arguments.queryResultArray))))>
	<cfset aiDebug = "AI Chart Selector: " & serializeJSON(aiChartConfig)>
	<cfif structKeyExists(aiChartConfig, "confidence") AND aiChartConfig.confidence GTE aiChartConfidenceThreshold AND structKeyExists(aiChartConfig, "type") AND aiChartConfig.type NEQ "none" AND structKeyExists(aiChartConfig, "labelColumn") AND structKeyExists(aiChartConfig, "valueColumn")>
		<cfset chartType = aiChartConfig.type>
		<cfset chartTitle = aiChartConfig.title ?: "AI-Recommended Chart">
		<cfset labelColumn = aiChartConfig.labelColumn>
		<cfset valueColumn = aiChartConfig.valueColumn>
		<cfset currencyColumn = "">
		<cfif structKeyExists(aiChartConfig, "currencyColumn")>
			<cfset currencyColumn = aiChartConfig.currencyColumn>
		</cfif>
		<cfset result.recommendation = aiChartConfig.recommendation ?: "AI-selected chart config">
		<cfset chartStruct = generateChartHTML(arguments.queryResultArray, chartType, chartTitle, labelColumn, valueColumn, currencyColumn)>
		<cfset result.chartHTML = chartStruct.chartHTML>
		<cfset result.chartConfig = chartStruct.chartConfig>
		<cfset result.aiDebug = aiDebug>
		<cfreturn result>
	<cfelseif structKeyExists(aiChartConfig, "type") AND aiChartConfig.type EQ "none">
		<cfset result.recommendation = aiChartConfig.recommendation ?: "No chart generated (AI decision)">
		<cfset result.aiDebug = aiDebug>
		<cfreturn result>
	</cfif>
</cffunction>

<cffunction name="generateChartHTML" returntype="struct" access="private">
	<cfargument name="data" type="array" required="true">
	<cfargument name="chartType" type="string" required="true">
	<cfargument name="title" type="string" required="true">
	<cfargument name="labelColumn" type="string" required="true">
	<cfargument name="valueColumn" type="string" required="true">
	<cfargument name="currencyColumn" type="string" default="">
	
	<cfset chartId = "chart_" & createUUID()>
	<cfset labels = []>
	<cfset values = []>
	<cfset currency = "">
	
	<!--- Collect data points --->
	<cfset missingLabel = false>
	<cfset missingValue = false>
	<cfset missingCurrency = false>
	<cfloop array="#arguments.data#" index="row">
		<cfif structKeyExists(row, arguments.labelColumn)>
			<cfset arrayAppend(labels, row[arguments.labelColumn])>
		<cfelse>
			<cfset arrayAppend(labels, "⚠️ MISSING")>
			<cfset missingLabel = true>
		</cfif>
		<cfif structKeyExists(row, arguments.valueColumn)>
			<cfset arrayAppend(values, val(row[arguments.valueColumn]))>
		<cfelse>
			<cfset arrayAppend(values, 0)>
			<cfset missingValue = true>
		</cfif>
		<cfif len(arguments.currencyColumn) AND len(currency) EQ 0>
			<cfif structKeyExists(row, arguments.currencyColumn)>
				<cfset currency = row[arguments.currencyColumn]>
			<cfelse>
				<cfset currency = "⚠️ MISSING">
				<cfset missingCurrency = true>
			</cfif>
		</cfif>
	</cfloop>
	
	<!--- Generate chart colors based on type --->
	<cfset colors = []>
	<cfif arguments.chartType EQ "pie">
		<cfset colors = ["##e74c3c", "##3498db", "##2ecc71", "##f39c12", "##9b59b6", "##1abc9c", "##34495e", "##95a5a6"]>
	<cfelse>
		<cfset colors = ["rgba(52, 152, 219, 0.8)"]>
	</cfif>
	
	<!--- Build Chart.js config struct using bracket notation for all keys --->
	<cfset chartConfig = structNew()>
	<cfset chartConfig["type"] = arguments.chartType>
	<cfset chartConfig["canvasId"] = chartId>
	<cfset chartConfig["data"] = structNew()>
	<cfset chartConfig["data"]["labels"] = labels>
	<cfset chartConfig["data"]["datasets"] = arrayNew(1)>
	<cfset chartConfig["data"]["datasets"][1] = structNew()>
	<cfset chartConfig["data"]["datasets"][1]["label"] = arguments.title>
	<cfset chartConfig["data"]["datasets"][1]["data"] = values>
	<cfset chartConfig["data"]["datasets"][1]["backgroundColor"] = colors>
	<cfset chartConfig["data"]["datasets"][1]["borderColor"] = (arguments.chartType EQ "pie" ? [] : ["rgba(52, 152, 219, 1)"])>
	<cfset chartConfig["data"]["datasets"][1]["borderWidth"] = 1>
	
	<cfset chartConfig["options"] = structNew()>
	<cfset chartConfig["options"]["responsive"] = true>
	<cfset chartConfig["options"]["plugins"] = structNew()>
	<cfset chartConfig["options"]["plugins"]["title"] = structNew()>
	<cfset chartConfig["options"]["plugins"]["title"]["display"] = true>
	<cfset chartConfig["options"]["plugins"]["title"]["text"] = arguments.title>
	<cfset chartConfig["options"]["plugins"]["legend"] = structNew()>
	<cfset chartConfig["options"]["plugins"]["legend"]["display"] = (arguments.chartType EQ "pie")>
	<cfset chartConfig["options"]["plugins"]["legend"]["position"] = (arguments.chartType EQ "pie" ? "bottom" : "top")>
	<cfif arguments.chartType EQ "pie">
		<cfset chartConfig["options"]["scales"] = structNew()>
	<cfelse>
		<cfset chartConfig["options"]["scales"] = structNew()>
		<cfset chartConfig["options"]["scales"]["y"] = structNew()>
		<cfset chartConfig["options"]["scales"]["y"]["beginAtZero"] = true>
		<cfset chartConfig["options"]["scales"]["y"]["title"] = structNew()>
		<cfset chartConfig["options"]["scales"]["y"]["title"]["display"] = true>
		<cfset chartConfig["options"]["scales"]["y"]["title"]["text"] = "Amount" & (len(currency) ? " (" & currency & ")" : "")>
	</cfif>
	
	<cfset chartHTML = "<div style='margin: 20px 0; padding: 15px; border: 1px solid ##ddd; border-radius: 8px; background: ##fff;'><canvas id='" & chartId & "' width='400' height='200'></canvas></div>">
	
	<cfreturn { chartHTML = chartHTML, chartConfig = chartConfig }>
</cffunction>

<cffunction name="calculateAutoTotals" returntype="struct" access="private">
	<cfargument name="queryResultArray" type="array" required="true">
	<cfargument name="userMsg" type="string" required="true">
	
	<cfset result = {
		"totalRecords": 0,
		"totalAmount": 0,
		"averageAmount": 0
	}>
	
	<!--- Skip if no data --->
	<cfif arrayLen(arguments.queryResultArray) EQ 0>
		<cfreturn result>
	</cfif>
	
	<cfset result.totalRecords = arrayLen(arguments.queryResultArray)>
	<cfset firstRow = arguments.queryResultArray[1]>
	<cfset columns = structKeyArray(firstRow)>
	
	<!--- Use AI agent for column detection --->
	<cfset sampleRows = arraySlice(arguments.queryResultArray, 1, min(10, arrayLen(arguments.queryResultArray)))>
	<cfset aiColDetect = aiColumnDetectionAgent(arguments.userMsg, schema, sampleRows)>
	<cfset amountColumns = structKeyExists(aiColDetect, "amountColumns") ? aiColDetect.amountColumns : []>
	<cfset currencyColumns = structKeyExists(aiColDetect, "currencyColumns") ? aiColDetect.currencyColumns : []>
	<cfset dateColumns = structKeyExists(aiColDetect, "dateColumns") ? aiColDetect.dateColumns : []>
	
	<!--- Filter AI-detected amountColumns to only those present in the result row --->
	<cfset validCols = structKeyArray(firstRow)>
	<cfset filtered = []>
	<cfloop array="#amountColumns#" index="c">
		<cfif arrayFindNoCase(validCols, c)>
			<cfset arrayAppend(filtered, c)>
		</cfif>
	</cfloop>
	<cfset amountColumns = filtered>
	
	<!--- Fallback to old logic if AI returns nothing --->
	<cfif arrayLen(amountColumns) EQ 0>
		<cfloop array="#columns#" index="col">
			<cfloop array="#totalsRules.amountPatterns#" index="ap">
				<cfif refindnocase(ap, col) AND (isNumeric(firstRow[col]) OR (isSimpleValue(firstRow[col]) AND val(firstRow[col]) NEQ 0))>
					<cfset arrayAppend(amountColumns, col)>
					<cfbreak>
				</cfif>
			</cfloop>
			<cfloop array="#totalsRules.currencyPatterns#" index="cp">
				<cfif refindnocase(cp, col)>
					<cfset arrayAppend(currencyColumns, col)>
					<cfbreak>
				</cfif>
			</cfloop>
			<cfif refindnocase("date", col)>
				<cfset arrayAppend(dateColumns, col)>
			</cfif>
		</cfloop>
	</cfif>
	
	<cfset totalsData = {}>
	<cfset grandTotal = 0>
	<cfset grandCount = 0>
	<cfset currencyTotals = {}>
	<cfset mainCurrency = "">
	
	<!--- Get currency information --->
	<cfif arrayLen(currencyColumns) GT 0>
		<cfif structKeyExists(arguments.queryResultArray[1], currencyColumns[1])>
			<cfset mainCurrency = arguments.queryResultArray[1][currencyColumns[1]]>
		<cfelse>
			<cfset mainCurrency = "⚠️ MISSING">
		</cfif>
	</cfif>
	
	<!--- If groupedAmountCol found, sum it for grandTotal --->
	<cfif len(amountColumns) GT 0>
		<cfset validRows = 0>
		<cfset columnTotal = 0>
		<cfloop array="#arguments.queryResultArray#" index="row">
			<cfif structKeyExists(row, amountColumns[1]) AND isNumeric(row[amountColumns[1]])>
				<cfset columnTotal += val(row[amountColumns[1]])>
				<cfset validRows++>
				<!--- Track currency totals if possible --->
				<cfif arrayLen(currencyColumns) GT 0>
					<cfif structKeyExists(row, currencyColumns[1])>
						<cfset rowCurrency = row[currencyColumns[1]]>
					<cfelse>
						<cfset rowCurrency = "⚠️ MISSING">
					</cfif>
					<cfif NOT structKeyExists(currencyTotals, rowCurrency)>
						<cfset currencyTotals[rowCurrency] = 0>
					</cfif>
					<cfset currencyTotals[rowCurrency] += val(row[amountColumns[1]])>
				</cfif>
			</cfif>
		</cfloop>
		<cfset grandTotal = columnTotal>
		<cfset grandCount = validRows>
		<cfset totalsData[amountColumns[1]] = {
			"total": columnTotal,
			"average": validRows GT 0 ? columnTotal / validRows : 0,
			"min": 0,
			"max": 0,
			"count": validRows,
			"formattedTotal": columnTotal,
			"formattedAverage": validRows GT 0 ? columnTotal / validRows : 0
		}>
	<cfelse>
		<!--- Fallback to previous logic for non-grouped queries --->
		<cfloop array="#amountColumns#" index="amountCol">
			<cfset columnTotal = 0>
			<cfset columnCount = 0>
			<cfset columnMin = 0>
			<cfset columnMax = 0>
			<cfset validRows = 0>
			<cfloop array="#arguments.queryResultArray#" index="row">
				<cfset cellValue = row[amountCol]>
				<cfif isNumeric(cellValue)>
					<cfset numValue = val(cellValue)>
					<cfset columnTotal += numValue>
					<cfset validRows++>
					<cfif validRows EQ 1>
						<cfset columnMin = numValue>
						<cfset columnMax = numValue>
					<cfelse>
						<cfif numValue LT columnMin>
							<cfset columnMin = numValue>
						</cfif>
						<cfif numValue GT columnMax>
							<cfset columnMax = numValue>
						</cfif>
					</cfif>
					<!--- Track currency totals --->
					<cfif arrayLen(currencyColumns) GT 0>
						<cfif structKeyExists(row, currencyColumns[1])>
							<cfset rowCurrency = row[currencyColumns[1]]>
						<cfelse>
							<cfset rowCurrency = "⚠️ MISSING">
						</cfif>
						<cfif NOT structKeyExists(currencyTotals, rowCurrency)>
							<cfset currencyTotals[rowCurrency] = 0>
						</cfif>
						<cfset currencyTotals[rowCurrency] += numValue>
					</cfif>
				</cfif>
			</cfloop>
			<cfif validRows GT 0>
				<cfset totalsData[amountCol] = {
					"total": columnTotal,
					"average": columnTotal / validRows,
					"min": columnMin,
					"max": columnMax,
					"count": validRows,
					"formattedTotal": columnTotal,
					"formattedAverage": columnTotal / validRows
				}>
				<cfif grandCount EQ 0>
					<cfset grandTotal = columnTotal>
					<cfset grandCount = validRows>
				</cfif>
			</cfif>
		</cfloop>
	</cfif>
	<!--- Format currency totals --->
	<cfset formattedCurrencyTotals = []>
	<cfloop collection="#currencyTotals#" item="currency">
		<cfset arrayAppend(formattedCurrencyTotals, currencyTotals[currency] & " " & currency)>
	</cfloop>
	<!--- Build comprehensive result --->
	<cfset result = {
		"totalRecords": arrayLen(arguments.queryResultArray),
		"hasAmountData": arrayLen(amountColumns) GT 0 OR len(amountColumns),
		"amountColumns": amountColumns,
		"columnTotals": totalsData,
		"grandTotal": grandTotal,
		"grandTotalFormatted": grandTotal & (len(mainCurrency) ? " " & mainCurrency : ""),
		"averageAmount": grandCount GT 0 ? grandTotal / grandCount : 0,
		"averageAmountFormatted": grandCount GT 0 ? (grandTotal / grandCount) & (len(mainCurrency) ? " " & mainCurrency : "") : "0",
		"currencyBreakdown": formattedCurrencyTotals,
		"currencies": structKeyArray(currencyTotals),
		"dateRange": calculateDateRange(arguments.queryResultArray, dateColumns),
		"summaryText": generateTotalsSummary(totalsData, currencyTotals, mainCurrency, arrayLen(arguments.queryResultArray))
	}>
	<cfset anyMissingCurrency = false>
	<cfset anyMissingAmount = false>
	<cfif anyMissingCurrency OR anyMissingAmount>
		<cfset result.warning = "⚠️ Some required columns were missing in the result set. Calculations may be incomplete.">
	</cfif>
	<cfreturn result>
</cffunction>

<!--- AGENT 18 Helper Functions for Chart Generation --->

<cffunction name="generateChartHTML" returntype="struct" access="private">
	<cfargument name="data" type="array" required="true">
	<cfargument name="chartType" type="string" required="true">
	<cfargument name="title" type="string" required="true">
	<cfargument name="labelColumn" type="string" required="true">
	<cfargument name="valueColumn" type="string" required="true">
	<cfargument name="currencyColumn" type="string" default="">
	
	<cfset chartId = "chart_" & createUUID()>
	<cfset labels = []>
	<cfset values = []>
	<cfset currency = "">
	
	<!--- Collect data points --->
	<cfloop array="#arguments.data#" index="row">
		<cfset arrayAppend(labels, row[arguments.labelColumn])>
		<cfset arrayAppend(values, val(row[arguments.valueColumn]))>
		<cfif len(arguments.currencyColumn) AND len(currency) EQ 0>
			<cfset currency = row[arguments.currencyColumn]>
		</cfif>
	</cfloop>
	
	<!--- Generate chart colors based on type --->
	<cfset colors = []>
	<cfif arguments.chartType EQ "pie">
		<cfset colors = ["##e74c3c", "##3498db", "##2ecc71", "##f39c12", "##9b59b6", "##1abc9c", "##34495e", "##95a5a6"]>
	<cfelse>
		<cfset colors = ["rgba(52, 152, 219, 0.8)"]>
	</cfif>
	
	<!--- Build Chart.js config struct using bracket notation for all keys --->
	<cfset chartConfig = structNew()>
	<cfset chartConfig["type"] = arguments.chartType>
	<cfset chartConfig["canvasId"] = chartId>
	<cfset chartConfig["data"] = structNew()>
	<cfset chartConfig["data"]["labels"] = labels>
	<cfset chartConfig["data"]["datasets"] = arrayNew(1)>
	<cfset chartConfig["data"]["datasets"][1] = structNew()>
	<cfset chartConfig["data"]["datasets"][1]["label"] = arguments.title>
	<cfset chartConfig["data"]["datasets"][1]["data"] = values>
	<cfset chartConfig["data"]["datasets"][1]["backgroundColor"] = colors>
	<cfset chartConfig["data"]["datasets"][1]["borderColor"] = (arguments.chartType EQ "pie" ? [] : ["rgba(52, 152, 219, 1)"])>
	<cfset chartConfig["data"]["datasets"][1]["borderWidth"] = 1>
	
	<cfset chartConfig["options"] = structNew()>
	<cfset chartConfig["options"]["responsive"] = true>
	<cfset chartConfig["options"]["plugins"] = structNew()>
	<cfset chartConfig["options"]["plugins"]["title"] = structNew()>
	<cfset chartConfig["options"]["plugins"]["title"]["display"] = true>
	<cfset chartConfig["options"]["plugins"]["title"]["text"] = arguments.title>
	<cfset chartConfig["options"]["plugins"]["legend"] = structNew()>
	<cfset chartConfig["options"]["plugins"]["legend"]["display"] = (arguments.chartType EQ "pie")>
	<cfset chartConfig["options"]["plugins"]["legend"]["position"] = (arguments.chartType EQ "pie" ? "bottom" : "top")>
	<cfif arguments.chartType EQ "pie">
		<cfset chartConfig["options"]["scales"] = structNew()>
	<cfelse>
		<cfset chartConfig["options"]["scales"] = structNew()>
		<cfset chartConfig["options"]["scales"]["y"] = structNew()>
		<cfset chartConfig["options"]["scales"]["y"]["beginAtZero"] = true>
		<cfset chartConfig["options"]["scales"]["y"]["title"] = structNew()>
		<cfset chartConfig["options"]["scales"]["y"]["title"]["display"] = true>
		<cfset chartConfig["options"]["scales"]["y"]["title"]["text"] = "Amount" & (len(currency) ? " (" & currency & ")" : "")>
	</cfif>
	
	<cfset chartHTML = "<div style='margin: 20px 0; padding: 15px; border: 1px solid ##ddd; border-radius: 8px; background: ##fff;'><canvas id='" & chartId & "' width='400' height='200'></canvas></div>">
	
	<cfreturn { chartHTML = chartHTML, chartConfig = chartConfig }>
</cffunction>

<!--- AGENT 19 Helper Functions for Auto-Totals --->

<cffunction name="calculateDateRange" returntype="string" access="private">
	<cfargument name="data" type="array" required="true">
	<cfargument name="dateColumns" type="array" required="true">
	
	<cfif arrayLen(arguments.dateColumns) EQ 0 OR arrayLen(arguments.data) EQ 0>
		<cfreturn "">
	</cfif>
	
	<cfset dateCol = arguments.dateColumns[1]>
	<cfset dates = []>
	
	<cfloop array="#arguments.data#" index="row">
		<cfif structKeyExists(row, dateCol) AND len(row[dateCol])>
			<cftry>
				<cfset arrayAppend(dates, parseDateTime(row[dateCol]))>
				<cfcatch>
					<!--- Skip invalid dates --->
				</cfcatch>
			</cftry>
		</cfif>
	</cfloop>
	
	<cfif arrayLen(dates) GT 0>
		<!--- Sort date objects numerically since 'date' is invalid ---
		Possible sort types: text, textNoCase, numeric --->
		<cfset arraySort(dates, "numeric")>
		<cfif arrayLen(dates) EQ 1>
			<cfreturn dateFormat(dates[1], "dd-mmm-yyyy")>
		<cfelse>
			<cfreturn dateFormat(dates[1], "dd-mmm-yyyy") & " to " & dateFormat(dates[arrayLen(dates)], "dd-mmm-yyyy")>
		</cfif>
	</cfif>
	
	<cfreturn "">
</cffunction>

<cffunction name="generateTotalsSummary" returntype="string" access="private">
	<cfargument name="totalsData" type="struct" required="true">
	<cfargument name="currencyTotals" type="struct" required="true">
	<cfargument name="mainCurrency" type="string" required="true">
	<cfargument name="recordCount" type="numeric" required="true">
	
	<cfset summary = "Summary Statistics:<br>">
	<cfset summary &= "Total Records: " & arguments.recordCount & "<br>">
	
	<cfset aiGenerateTotalsSummaryPrompt_systemMessage = "
	You must strictly limit your response to a maximum of 500 tokens.
	
	Pretend you are a Data Statistics Agent. You are very good at analyzing data relationships and producing detailed, readable summary reports.
	Output the summary in HTML format. 

	">
	<cfset aiGenerateTotalsSummaryPrompt = "
	Please generate a professional summary statistics report based on the following JSON data.
	
	Total Data: #serializeJSON(totalsData)#
	Currency Totals: #serializeJSON(currencyTotals)#
	Main Currency: #mainCurrency#
	RecordCount: #recordCount#
	">
	<cfset aiGenerateTotalsSummaryPromptSession = LuceeCreateAISession(
	name='gpt002',
	systemMessage=aiGenerateTotalsSummaryPrompt_systemMessage
	)>
	<cfset aiGenerateTotalsSummaryResult = trim(LuceeInquiryAISession(
	aiGenerateTotalsSummaryPromptSession,
	aiGenerateTotalsSummaryPrompt
	))>
	
	
	<cfset summary = aiGenerateTotalsSummaryResult>
	
	<cfreturn summary>
</cffunction>


<!--- AI Agent: Document Type Mapper --->
<cffunction name="aiDocumentTypeMapper" access="private" returntype="struct">
	<cfargument name="userMsg" type="string" required="true">
	<cfargument name="schema" type="struct" required="true">
	
	<cfset var schemaSummary = "">
	<cfloop collection="#arguments.schema#" item="tableName">
		<cfif isStruct(arguments.schema[tableName]) AND structKeyExists(arguments.schema[tableName], "document_types")>
			<cfset docTypes = structKeyArray(arguments.schema[tableName]["document_types"])/>
			<cfset schemaSummary &= "- " & tableName & ": [" & arrayToList(docTypes, ", ") & "]\n">
		</cfif>
	</cfloop>
	
	<cfset var prompt = "You must strictly limit your response to a maximum of 500 tokens. You are a business data schema expert. Given the following schema and a user question, suggest the most relevant table and document type. " &
	"SCHEMA: " & schemaSummary &
	" User question: " & arguments.userMsg &
	" Respond in JSON: {""table"": ""table_name"", ""doc_type"": ""doc_type_code""}. If unsure, respond: {""table"": ""unknown""}">
	
        <cfset var aiResponse = callAI(prompt, arguments.userMsg)>
        <cfset var result = safeDeserializeJSON(aiResponse, { "table": "unknown" })>
        <cfreturn result>
</cffunction>

<!--- Refactor main logic to use AI agent for document type mapping --->
<!--- Remove or comment out docTypeUserMap and related mapping code --->
<!--- Replace with: --->
<cfset aiDocTypeMapResult = aiDocumentTypeMapper(userMsg, schema)>
<cfset mappedDocType = "">
<cfset mappedTable = "">
<cfif structKeyExists(aiDocTypeMapResult, "table") AND aiDocTypeMapResult.table NEQ "unknown">
	<cfset mappedTable = aiDocTypeMapResult.table>
	<cfset mappedDocType = structKeyExists(aiDocTypeMapResult, "doc_type") ? aiDocTypeMapResult.doc_type : "">
</cfif>
// Fallback: If mappedTable is still blank, use old logic as before

<!--- AI Agent: Data Quality Explanation --->
<cffunction name="aiDataQualityExplanationAgent" access="private" returntype="string">
	<cfargument name="userMsg" type="string" required="true">
	<cfargument name="schema" type="struct" required="true">
	<cfargument name="sampleRows" type="array" required="true">
	
	<cfset var schemaSummary = "">
	<cfloop collection="#arguments.schema#" item="tableName">
		<cfif isStruct(arguments.schema[tableName]) AND structKeyExists(arguments.schema[tableName], "columns")>
			<cfset schemaSummary &= "- " & tableName & ": [" & arrayToList(structKeyArray(arguments.schema[tableName]["columns"]), ", ") & "]\n">
		</cfif>
	</cfloop>
	
	<cfset var prompt = "You must strictly limit your response to a maximum of 500 tokens. You are a business data quality expert. Given the following schema, a user question, and a sample of the data, explain any data quality issues (such as NULLs, empty fields, or outliers) that are relevant to the user's query. If there are no issues, say so.\n\nSCHEMA:\n" & schemaSummary & "\nUser question: " & arguments.userMsg & "\nSample data: " & serializeJSON(arguments.sampleRows) & "\n\nExplanation:">
	<cfset var dataQualitySession = LuceeCreateAISession(name="gpt002", systemMessage=prompt)>
	<cfset var aiResponse = LuceeInquiryAISession(dataQualitySession, arguments.userMsg)>
	<cfreturn trim(aiResponse)>
</cffunction>


<!--- Example usage: Replace hardcoded data quality explanations with AI agent call --->
<!--- In the relevant section (e.g., when user asks about NULLs or data quality): --->
<cfif findNoCase("null", userMsg) OR findNoCase("empty", userMsg) OR findNoCase("data quality", userMsg)>
	<cfset sampleRows = arraySlice(queryResultArray, 1, min(10, arrayLen(queryResultArray)))>
	<cfset dataQualityExplanation = aiDataQualityExplanationAgent(userMsg, schema, sampleRows)>
	<cfoutput>
		#serializeJSON({
			summary = dataQualityExplanation,
			sql = sqlOut,
			table = prettyTable,
			debug = "AI Data Quality Explanation Agent used"
		})#
	</cfoutput>
	<cfabort>
</cfif>

<!--- AI Agent: Column Detection for Totals/Summaries --->
<cffunction name="aiColumnDetectionAgent" access="private" returntype="struct">
	<cfargument name="userMsg" type="string" required="true">
	<cfargument name="schema" type="struct" required="true">
	<cfargument name="sampleRows" type="array" required="true">
	
	<cfset var schemaSummary = "">
	<cfloop collection="#arguments.schema#" item="tableName">
		<cfif isStruct(arguments.schema[tableName]) AND structKeyExists(arguments.schema[tableName], "columns")>
			<cfset schemaSummary &= "- " & tableName & ": [" & arrayToList(structKeyArray(arguments.schema[tableName]["columns"]), ", ") & "]\n">
		</cfif>
	</cfloop>
	
	<cfset var prompt = "You must strictly limit your response to a maximum of 500 tokens. You are a business data expert. Given the following schema, user question, and a sample of the data, identify:" &
	CHR(10) & "- The column(s) that represent amounts (e.g., sales, totals, sums)" &
	CHR(10) & "- The column(s) that represent currency" &
	CHR(10) & "- The column(s) that represent dates" &
	CHR(10) & CHR(10) & "Respond in JSON:" &
	CHR(10) & "{" &
		CHR(10) & "  ""amountColumns"": [""col1"", ...]," &
		CHR(10) & "  ""currencyColumns"": [""col2"", ...]," &
		CHR(10) & "  ""dateColumns"": [""col3"", ...]" &
	CHR(10) & "}" &
	CHR(10) & CHR(10) & "SCHEMA:" & CHR(10) & schemaSummary &
	CHR(10) & "User question: " & arguments.userMsg &
	CHR(10) & "Sample data: " & serializeJSON(arguments.sampleRows) &
	CHR(10) & CHR(10) & "JSON:" >
	
        <cfset var aiResponse = callAI(prompt, arguments.userMsg)>
        <cfset var result = safeDeserializeJSON(aiResponse, { "amountColumns": [], "currencyColumns": [], "dateColumns": [] })>
        <cfreturn result>
</cffunction>


<!--- AI Agent: SQL Error Recovery --->
<cffunction name="aiSqlErrorRecoveryAgent" access="private" returntype="struct">
	<cfargument name="sql" type="string" required="true">
	<cfargument name="errorMessage" type="string" required="true">
	<cfargument name="userMsg" type="string" required="true">
	<cfargument name="schema" type="struct" required="true">
	
	<cfset var schemaSummary = "">
	<cfloop collection="#arguments.schema#" item="tableName">
		<cfif isStruct(arguments.schema[tableName]) AND structKeyExists(arguments.schema[tableName], "columns")>
			<cfset schemaSummary &= "- " & tableName & ": [" & arrayToList(structKeyArray(arguments.schema[tableName]["columns"]), ", ") & "]\n">
		</cfif>
	</cfloop>
	
	<cfset var prompt = "You must strictly limit your response to a maximum of 500 tokens. You are a SQL expert. Given the following SQL statement, error message, user question, and schema, suggest a corrected SQL statement or explain the error." &
	CHR(10) & CHR(10) & "SQL: " & arguments.sql &
	CHR(10) & "Error: " & arguments.errorMessage &
	CHR(10) & "User question: " & arguments.userMsg &
	CHR(10) & "SCHEMA:" & CHR(10) & schemaSummary &
	CHR(10) & CHR(10) & "Respond in JSON: {""canRecover"": true/false, ""recoveredSQL"": ""..."", ""recoveryDescription"": ""...""}. If you cannot suggest a fix, set canRecover to false.">
	
        <cfset var aiResponse = callAI(prompt, arguments.userMsg)>
        <cfset var result = safeDeserializeJSON(aiResponse, { "canRecover": false, "recoveredSQL": arguments.sql, "recoveryDescription": "No recovery possible (AI parse error)" })>
        <cfreturn result>
</cffunction>

<cffunction name="validateSQLRequiredColumns" access="private" returntype="struct">
	<cfargument name="sql" type="string" required="true">
	<cfargument name="requiredColumns" type="array" required="true">
	
	<cfset var result = { isValid: true, missingColumns: [], enhancedSQL: arguments.sql }>
	
	<!--- Extract SELECT clause columns (robust parser)--->
	<cfset var selectPattern = "^select\s+(.*?)\s+from" >
	<cfset var selectMatch = reFindNoCase(selectPattern, arguments.sql, 1, true)>
	<cfset var selectColumns = []>
	<cfif structKeyExists(selectMatch, "len") AND arrayLen(selectMatch.len) GTE 2 AND selectMatch.len[2] GT 0
		AND structKeyExists(selectMatch, "pos") AND arrayLen(selectMatch.pos) GTE 2>
		<cfset var selectClause = mid(arguments.sql, selectMatch.pos[2], selectMatch.len[2])>
		<cfset var rawColumns = listToArray(selectClause, ",")>
		<cfloop array="#rawColumns#" index="colExpr">
			<!-- Remove AS ... (case-insensitive), function calls, and trim -->
			<cfset var col = trim(colExpr)>
			<!-- Remove everything after AS (case-insensitive) -->
			<cfif refindnocase("\\s+as\\s+", col)>
				<cfset col = rereplacenocase(col, "\\s+as\\s+.*$", "", "one")>
			</cfif>
			<!-- Remove function calls: e.g., SUM(amount_forex) -> amount_forex -->
			<cfif refindnocase("\\w+\\s*\\(([^)]+)\\)", col)>
				<cfset col = rereplacenocase(col, ".*\\(([^)]+)\\)", "\\1", "one")>
			</cfif>
			<!-- Remove table prefixes -->
			<cfif find(".", col)>
				<cfset col = listLast(col, ".")>
			</cfif>
			<cfset col = lcase(trim(col))>
			<cfif len(col)>
				<cfset arrayAppend(selectColumns, col)>
			</cfif>
		</cfloop>
	<cfelse>
		<!--- No match: set selectColumns to empty or handle as needed --->
		<cfset selectColumns = []>
	</cfif>
	
	<!--- Check for missing required columns --->
	<cfloop array="#arguments.requiredColumns#" index="reqCol">
		<cfif arrayFindNoCase(selectColumns, lcase(reqCol)) EQ 0>
			<cfset arrayAppend(result.missingColumns, reqCol)>
		</cfif>
	</cfloop>
	<cfset result.isValid = arrayLen(result.missingColumns) EQ 0>
	<cfreturn result>
</cffunction>
