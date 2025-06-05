<cfsetting enablecfoutputonly="true">
<cfcontent type="application/json">

<!--- Main handler for AI chat backend --->
<cfparam name="form.prompt" default="">
<cfparam name="form.chatHistory" default="">
<cfset userPrompt = trim(form.prompt ?: url.prompt ?: "")>
<cfif NOT len(userPrompt)>
    <cfoutput>#serializeJSON({"error":"No prompt provided"})#</cfoutput><cfabort>
</cfif>

<!--- Load schema information for AI context --->
<cfset schema = deserializeJSON( fileRead( expandPath("./schema_config.json") ) )>

<!--- Initialize session based chat history --->
<cfif NOT structKeyExists(session, "chatHistory")>
    <cfset session.chatHistory = []>
</cfif>

<!--- Optional override with posted history --->
<cfif len(form.chatHistory)>
    <cftry>
        <cfset session.chatHistory = deserializeJSON(form.chatHistory)>
        <cfcatch></cfcatch>
    </cftry>
</cfif>

<!--- Determine action: new SQL, use previous results, or simple chat --->
<cfset action = determineAction(userPrompt, session.chatHistory)>

<cfif action EQ "chat">
    <cfset summary = generateChatReply(userPrompt)>
    <cfset session.chatHistory = updateHistory(session.chatHistory, userPrompt, "", [])>
    <cfoutput>#serializeJSON({
        summary = summary,
        rawData = [],
        chartData = {},
        chatHistory = session.chatHistory
    })#</cfoutput><cfabort>
</cfif>

<!--- If using previous results, answer based on last query result --->
<cfif action EQ "use_previous">
    <cfif arrayLen(session.chatHistory) EQ 0 OR NOT structKeyExists(session.chatHistory[arrayLen(session.chatHistory)], "data")>
        <cfoutput>#serializeJSON({"error":"No previous results in history"})#</cfoutput><cfabort>
    </cfif>
    <cfset lastData = session.chatHistory[arrayLen(session.chatHistory)].data>
    <cfset summary = summarizeData(lastData, userPrompt)>
    <cfset chart = generateChartData(lastData, userPrompt)>
    <cfset session.chatHistory = updateHistory(session.chatHistory, userPrompt, "", lastData)>
    <cfoutput>#serializeJSON({
        summary = summary,
        rawData = lastData,
        chartData = chart,
        chatHistory = session.chatHistory
    })#</cfoutput><cfabort>
</cfif>

<!--- Otherwise use AI to generate SQL and chart suggestion --->
<cfset aiResult = generateSQLUsingAI(userPrompt, schema)>
<cfif len(aiResult.error)>
    <cfoutput>#serializeJSON({"error": aiResult.error})#</cfoutput><cfabort>
</cfif>
<cfset validation = validateSQL(aiResult.sql, schema)>
<cfif NOT validation.isValid>
    <cfoutput>#serializeJSON({"error": validation.message})#</cfoutput><cfabort>
</cfif>
<cfset dataResult = runSQL(validation.sql)>
<cfif NOT dataResult.success>
    <cfoutput>#serializeJSON({"error":"Query execution failed","debug":dataResult.error})#</cfoutput><cfabort>
</cfif>
<cfset dataArr = dataResult.data>
<cfset summary = summarizeData(dataArr, userPrompt)>
<!--- Use AI suggested chart if possible --->
<cfset chart = buildChartFromSuggestion(dataArr, aiResult.chart)>
<cfif chart.type EQ "none">
    <cfset chart = generateChartData(dataArr, userPrompt)>
</cfif>

<cfset session.chatHistory = updateHistory(session.chatHistory, userPrompt, validation.sql, dataArr)>

<cfoutput>#serializeJSON({
    summary = summary,
    rawData = dataArr,
    chartData = chart,
    chatHistory = session.chatHistory
})#</cfoutput>

<!--- ---------------- Helper Functions ---------------- --->
<!---
    Purpose : Decide whether the user prompt requires a new SQL query,
              can reuse the previous result, or is simple chat.
    Inputs  : prompt (string), history (array)
    Returns : string ("sql", "use_previous", or "chat")
--->
<cffunction name="determineAction" output="false" returntype="string">
    <cfargument name="prompt" type="string" required="true">
    <cfargument name="history" type="array" required="true">
    <cfset var lower = lcase(arguments.prompt)>
    <cfif reFind("(?i)(total|list|show|find|sales|purchase|amount|order|invoice|product|customer)", lower)>
        <!--- if user references row or previous --->
        <cfif arrayLen(arguments.history) AND reFind("(?i)\b(row|above|previous|them|those)\b", lower)>
            <cfreturn "use_previous">
        </cfif>
        <cfreturn "sql">
    </cfif>
    <cfreturn "chat">
</cffunction>

<!---
    Purpose : Simple fallback reply when no SQL is required.
    Input   : prompt (string)
    Output  : string
--->
<cffunction name="generateChatReply" output="false" returntype="string">
    <cfargument name="prompt" type="string" required="true">
    <!--- Placeholder simple echo style reply --->
    <cfreturn "You said: " & arguments.prompt>
</cffunction>

<!---
    Purpose : Invoke the AI with a detailed system prompt to generate SQL
              and chart suggestions.
    Inputs  : prompt (string) - the user question
              schema (struct) - loaded schema JSON
    Returns : struct {sql, summary, chart:{type,labelsColumn,valuesColumn}, error}
--->
<cffunction name="generateSQLUsingAI" output="false" returntype="struct">
    <cfargument name="prompt" type="string" required="true">
    <cfargument name="schema" type="struct" required="true">
    <cfset var result = {sql:"", summary:"", chart:{type:"none", labelsColumn:"", valuesColumn:""}, error:""}>
    <cfset var sysPrompt = buildSystemPrompt(arguments.schema)>
    <cfset var aiSession = LuceeCreateAISession(name="sql", systemMessage=sysPrompt)>
    <cfset var aiResponse = LuceeInquiryAISession(aiSession, arguments.prompt)>
    <cftry>
        <cfset var parsed = deserializeJSON(aiResponse)>
        <cfset result = structAppend(result, parsed, true)>
        <cfcatch>
            <cfset result.error = "AI returned invalid JSON">
        </cfcatch>
    </cftry>
    <cfreturn result>
</cffunction>

<!---
    Purpose : Validate the generated SQL to enforce read-only access
    Inputs  : sql (string), schema (struct)
    Returns : struct {isValid:boolean, message:string, sql:string}
--->
<cffunction name="validateSQL" output="false" returntype="struct">
    <cfargument name="sql" type="string" required="true">
    <cfargument name="schema" type="struct" required="true">
    <cfset var result = {isValid:false, message:"", sql:arguments.sql}>
    <cfset var q = lcase(trim(arguments.sql))>
    <cfif NOT reFind("^select", q)>
        <cfset result.message = "Only SELECT statements allowed">
        <cfreturn result>
    </cfif>
    <cfif reFind("(?i)\b(update|delete|insert|drop|alter)\b", q)>
        <cfset result.message = "Modification statements not allowed">
        <cfreturn result>
    </cfif>
    <!--- simple table whitelist check --->
    <cfset tables = []>
    <cfset raw = rematch("(?i)(?:from|join)\s+([a-z0-9_]+)", q)>
    <cfloop array="#raw#" index="m">
        <cfset t = lcase(reReplace(m,"(?i)(from|join)\s+",""))>
        <cfset arrayAppend(tables, t)>
    </cfloop>
    <cfloop array="#tables#" index="tbl">
        <cfif NOT structKeyExists(arguments.schema, tbl)>
            <cfset result.message = "Unauthorized table: " & tbl>
            <cfreturn result>
        </cfif>
    </cfloop>
    <cfset result.isValid = true>
    <cfset result.sql = arguments.sql>
    <cfreturn result>
</cffunction>

<!---
    Purpose : Execute the validated SQL against PostgreSQL and return array data
    Input   : sql (string)
    Output  : struct {success:boolean, data:array, error:string}
--->
<cffunction name="runSQL" output="false" returntype="struct">
    <cfargument name="sql" type="string" required="true">
    <cfset var dsn = cookie.cooksql_mainsync & "_active">
    <cfset var res = {success:false, data:[], error:""}>
    <cftry>
        <cfquery name="q" datasource="#dsn#" timeout="20">#preserveSingleQuotes(arguments.sql)#</cfquery>
        <cfset arr = []>
        <cfloop query="q">
            <cfset row = {}>
            <cfloop list="#q.columnList#" index="col">
                <cfset row[col] = q[col][currentRow]>
            </cfloop>
            <cfset arrayAppend(arr, row)>
        </cfloop>
        <cfset res.success = true>
        <cfset res.data = arr>
        <cfcatch>
            <cfset res.error = cfcatch.message>
        </cfcatch>
    </cftry>
    <cfreturn res>
</cffunction>

<!---
    Purpose : Ask the AI to summarize the returned data in plain English
    Inputs  : data (array), prompt (string)
    Output  : string
--->
<cffunction name="summarizeData" output="false" returntype="string">
    <cfargument name="data" type="array" required="true">
    <cfargument name="prompt" type="string" required="true">
    <cfif arrayLen(arguments.data) EQ 0>
        <cfreturn "No records found" >
    </cfif>
    <cfset var sample = arraySlice(arguments.data,1,5)>
    <cfset var sys = "Summarize the following data for the user's question:" & serializeJSON(sample)>
    <cfset var session = LuceeCreateAISession(name="summary", systemMessage=sys)>
    <cfset var reply = LuceeInquiryAISession(session, arguments.prompt)>
    <cfreturn trim(reply)>
</cffunction>

<!---
    Purpose : Build a simple bar chart suggestion from returned data
    Inputs  : data (array), prompt (string)
    Output  : struct {type, labels, values}
--->
<cffunction name="generateChartData" output="false" returntype="struct">
    <cfargument name="data" type="array" required="true">
    <cfargument name="prompt" type="string" required="true">
    <cfset var result = {type:"none", labels:[], values:[]}>
    <cfif arrayLen(arguments.data) EQ 0>
        <cfreturn result>
    </cfif>
    <cfset var row = arguments.data[1]>
    <!--- choose first numeric column and first text column --->
    <cfset var labelCol = "">
    <cfset var valueCol = "">
    <cfloop collection="#row#" item="col">
        <cfif NOT len(labelCol) AND isSimpleValue(row[col]) AND NOT isNumeric(row[col])>
            <cfset labelCol = col>
        <cfelseif NOT len(valueCol) AND isNumeric(row[col])>
            <cfset valueCol = col>
        </cfif>
    </cfloop>
    <cfif len(labelCol) AND len(valueCol)>
        <cfloop array="#arguments.data#" index="r">
            <cfset arrayAppend(result.labels, r[labelCol])>
            <cfset arrayAppend(result.values, r[valueCol])>
        </cfloop>
        <cfset result.type = "bar">
    </cfif>
    <cfreturn result>
</cffunction>
<!---
    Purpose : Store the latest interaction in session history
    Inputs  : history (array), prompt (string), sql (string), data (array)
    Output  : updated array
--->
<cffunction name="updateHistory" output="false" returntype="array">
    <cfargument name="history" type="array" required="true">
    <cfargument name="prompt" type="string" required="true">
    <cfargument name="sql" type="string" required="true">
    <cfargument name="data" type="array" required="true">
    <cfset var newEntry = {prompt=arguments.prompt, sql=arguments.sql, data=arguments.data}>
    <cfset arrayAppend(arguments.history, newEntry)>
    <cfreturn arguments.history>
</cffunction>

<!---
    Purpose : Produce a quick text summary of table columns for the AI
    Input   : schema (struct)
    Output  : string
--->
<cffunction name="buildSchemaSummary" output="false" returntype="string">
    <cfargument name="schema" type="struct" required="true">
    <cfset var out = "">
    <cfloop collection="#arguments.schema#" item="tbl">
        <cfset out &= tbl & ": " & structKeyList(arguments.schema[tbl].columns,", ") & chr(10)>
    </cfloop>
    <cfreturn out>
</cffunction>

<!---
    Build the detailed system prompt that injects schema and business rules
    for the AI to generate SQL safely.
--->
<cffunction name="buildSystemPrompt" output="false" returntype="string">
    <cfargument name="schema" type="struct" required="true">
    <cfset var schemaJson = serializeJSON(arguments.schema)>
    <cfset var prompt = "You are a backend AI agent for an enterprise business analytics chat system." & chr(10) &
        "" & chr(10) &
        "Your goals:" & chr(10) &
        "- Generate safe, parameterized SELECT SQL for PostgreSQL using only the allowed tables/columns/logic described in the schema, relationships, and business rules below." & chr(10) &
        "- Suggest a visualization (chart) type and mapping for each query result (bar, line, pie, etc., with label/value columns)." & chr(10) &
        "- Write a plain English summary of the query intent and result." & chr(10) &
        "- Respect all business rules exactly as written—never ignore them." & chr(10) &
        "- If the prompt requests a modification (UPDATE/DELETE/INSERT), refuse and return an error." & chr(10) &
        "- If the user's intent cannot be fulfilled from the schema, respond with an error in your output JSON." & chr(10) &
        chr(10) &
        "ALWAYS output in the following JSON format:" & chr(10) &
        '{"sql":"(your SQL SELECT statement here, or empty if not possible)","summary":"(one-paragraph summary of what the query does)","chart":{"type":"(bar|line|pie|none)","labelsColumn":"(the best column for labels, or empty)","valuesColumn":"(the best column for values, or empty)"},"error":"(error message if any, otherwise empty string)"}' & chr(10) &
        chr(10) &
        "YOUR SCHEMA:" & chr(10) & schemaJson & chr(10) &
        chr(10) &
        "BUSINESS RULES:" & chr(10) &
        "* For all queries, always filter by `tag_deleted_yn = 'n'` for active records." & chr(10) &
        "* Use `tag_table_usage` to filter by document type (e.g., `sal_inv` for Sales Invoices, `pur_po` for Purchase Orders)." & chr(10) &
        "* For workflow-approved documents, always filter by `tag_wflow_app_yn = 'y'`." & chr(10) &
        "* When joining with customers or vendors, use the unique system ID (`party_unique`), NOT the code." & chr(10) &
        "* For staff queries, only include rows where `staff_desc IS NOT NULL AND staff_desc != ''`." & chr(10) &
        "* Never repeat the same column multiple times in a SELECT." & chr(10) &
        "* Always add LIMIT for performance (suggest `LIMIT 100`)." & chr(10) &
        "* For customer/vendor queries, add `AND party_desc IS NOT NULL AND party_desc != ''`." & chr(10) &
        "* Use only the column names as listed in the schema, and respect column data types and intended use." & chr(10) &
        "* For amount/currency queries: include currency columns only once." & chr(10)>
    <cfreturn prompt>
</cffunction>

<!---
    Purpose : Build chart data from AI suggestion if columns exist in result
    Inputs  : data (array), suggest (struct)
    Output  : struct {type, labels, values}
--->
<cffunction name="buildChartFromSuggestion" output="false" returntype="struct">
    <cfargument name="data" type="array" required="true">
    <cfargument name="suggest" type="struct" required="true">
    <cfset var result = {type="none", labels=[], values=[]}>
    <cfif arrayLen(arguments.data) EQ 0>
        <cfreturn result>
    </cfif>
    <cfset var labelCol = arguments.suggest.labelsColumn>
    <cfset var valueCol = arguments.suggest.valuesColumn>
    <cfif len(labelCol) AND len(valueCol) AND structKeyExists(arguments.data[1], labelCol) AND structKeyExists(arguments.data[1], valueCol)>
        <cfset result.type = arguments.suggest.type>
        <cfloop array="#arguments.data#" index="r">
            <cfset arrayAppend(result.labels, r[labelCol])>
            <cfset arrayAppend(result.values, r[valueCol])>
        </cfloop>
    </cfif>
    <cfreturn result>
</cffunction>
