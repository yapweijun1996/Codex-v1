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

<!--- Otherwise generate new SQL --->
<cfset sql = generateSQLUsingAI(userPrompt, schema)>
<cfset validation = validateSQL(sql, schema)>
<cfif NOT validation.isValid>
    <cfoutput>#serializeJSON({"error": validation.message})#</cfoutput><cfabort>
</cfif>
<cfset dataResult = runSQL(validation.sql)>
<cfif NOT dataResult.success>
    <cfoutput>#serializeJSON({"error":"Query execution failed","debug":dataResult.error})#</cfoutput><cfabort>
</cfif>
<cfset dataArr = dataResult.data>
<cfset summary = summarizeData(dataArr, userPrompt)>
<cfset chart = generateChartData(dataArr, userPrompt)>

<cfset session.chatHistory = updateHistory(session.chatHistory, userPrompt, validation.sql, dataArr)>

<cfoutput>#serializeJSON({
    summary = summary,
    rawData = dataArr,
    chartData = chart,
    chatHistory = session.chatHistory
})#</cfoutput>

<!--- ---------------- Helper Functions ---------------- --->
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

<cffunction name="generateChatReply" output="false" returntype="string">
    <cfargument name="prompt" type="string" required="true">
    <!--- Placeholder simple echo style reply --->
    <cfreturn "You said: " & arguments.prompt>
</cffunction>

<cffunction name="generateSQLUsingAI" output="false" returntype="string">
    <cfargument name="prompt" type="string" required="true">
    <cfargument name="schema" type="struct" required="true">
    <cfset var schemaSummary = buildSchemaSummary(arguments.schema)>
    <cfset var sysPrompt = "Generate a parameterized SELECT SQL statement for PostgreSQL based on this user question. Use only tables and columns shown. Schema:" & chr(10) & schemaSummary>
    <cfset var aiSession = LuceeCreateAISession(name="sql", systemMessage=sysPrompt)>
    <cfset var aiResponse = LuceeInquiryAISession(aiSession, arguments.prompt)>
    <cfreturn trim(aiResponse)>
</cffunction>

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

<cffunction name="updateHistory" output="false" returntype="array">
    <cfargument name="history" type="array" required="true">
    <cfargument name="prompt" type="string" required="true">
    <cfargument name="sql" type="string" required="true">
    <cfargument name="data" type="array" required="true">
    <cfset var newEntry = {prompt=arguments.prompt, sql=arguments.sql, data=arguments.data}>
    <cfset arrayAppend(arguments.history, newEntry)>
    <cfreturn arguments.history>
</cffunction>

<cffunction name="buildSchemaSummary" output="false" returntype="string">
    <cfargument name="schema" type="struct" required="true">
    <cfset var out = "">
    <cfloop collection="#arguments.schema#" item="tbl">
        <cfset out &= tbl & ": " & structKeyList(arguments.schema[tbl].columns,", ") & chr(10)>
    </cfloop>
    <cfreturn out>
</cffunction>
