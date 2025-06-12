<cfsetting enablecfoutputonly="true">
<cfcontent type="application/json">
<cfinclude template="agents.cfm">
<cfset requestId = createUUID()>

<cftry>
    <!--- Initialize history array in the session --->
    <cfif NOT structKeyExists(session, "history") OR NOT isArray(session.history)>
        <cfset session.history = []>
    </cfif>
    <!--- 1. Get user input --->
    <cfparam name="form.msg" default="">
    <cfparam name="url.msg" default="">
    <cfset userMsg = trim(form.msg ?: url.msg ?: "")>
    <cfif !len(userMsg)>
        <cfoutput>#serializeJSON({error="No question provided.", debug={requestId=requestId}})#</cfoutput><cfabort>
    </cfif>

    <!--- 2. Load schema config --->
    <cfset schemaPath = expandPath("./schema_config.json")>
    <cfif not fileExists(schemaPath)>
        <cfoutput>#serializeJSON({error="Missing schema_config.json.", debug={requestId=requestId}})#</cfoutput><cfabort>
    </cfif>
    <cfset schemaString = fileRead(schemaPath)>
    <cfset schema = deserializeJSON(schemaString)>

    <!--- Planner agent decides which steps to run --->
    <cfset plan = planAgents(userMsg)>

    <!--- Database agent --->
    <cfset sql = "">
    <cfset data = queryNew("")>
    <cfset aiSql = "">
    <cfset debugMsg = "">
    <cfif plan.database>
    <cfset aiSqlResult = generateSQL(schemaString, userMsg)>
    <cfif isStruct(aiSqlResult)>
        <cfoutput>#serializeJSON({error=aiSqlResult.error ?: "AI session error", details=aiSqlResult.details, debug={requestId=requestId}})#</cfoutput><cfabort>
    </cfif>
    <cfset aiSql = aiSqlResult>
    <cfset sql = trim(aiSql)>
    <cfif NOT isValidSelect(sql)>
        <cfoutput>#serializeJSON({error="AI did not generate valid SQL", debug={requestId=requestId, plan=plan, aiResponse=aiSql}})#</cfoutput><cfabort>
    </cfif>
    <cfif right(sql,1) EQ ";">
        <cfset sql = left(sql, len(sql)-1)>
    </cfif>
    <!--- Ensure the datasource cookie is present before querying --->
    <cfif NOT structKeyExists(cookie, "cooksql_mainsync")>
        <cfoutput>#serializeJSON({error="Missing cookie 'cooksql_mainsync'.", debug={requestId=requestId}})#</cfoutput><cfabort>
    </cfif>
    <cflog type="information" text="requestId=#requestId# userMsg=#userMsg# sql=#sql#"/>
        <cftry>
            <cfquery name="data" datasource="#cookie.cooksql_mainsync#_active" timeout="20">
                #preserveSingleQuotes(sql)#
            </cfquery>
            <cfcatch>
                <cfoutput>#serializeJSON({error="SQL execution failed", details=cfcatch.message, sql=sql, debug={requestId=requestId}})#</cfoutput><cfabort>
            </cfcatch>
        </cftry>
        <cfif NOT data.recordCount>
            <cfset debugMsg = "Query returned 0 rows"> 
        </cfif>
    </cfif>

    <!--- Table agent --->
    <cfset prettyTable = "">
    <cfif plan.table AND plan.database>
        <cfset prettyTable = renderTable(data)>
    </cfif>

    <!--- Summary agent --->
    <cfset summary = "">
    <cfif plan.summary>
        <cfset summaryResult = summarizeResults(userMsg, sql, prettyTable)>
        <cfif isStruct(summaryResult)>
            <cfoutput>#serializeJSON({error=summaryResult.error ?: "AI session error", details=summaryResult.details, debug={requestId=requestId}})#</cfoutput><cfabort>
        </cfif>
        <cfset summary = summaryResult>
    <cfelseif plan.database>
        <cfset summary = "Found #data.recordCount# records.">
    </cfif>

    <!--- Conversation agent --->
    <cfset result = formatConversation(summary, sql, prettyTable)>
    <cfset arrayAppend(session.history, { user=userMsg, summary=summary, sql=sql, table=prettyTable })>
    <!--- Keep only last 20 exchanges --->
    <cfloop condition="arrayLen(session.history) GT 20">
        <cfset arrayDeleteAt(session.history, 1)>
    </cfloop>
    <cfset result.history = session.history>
    <cfset result.rowCount = data.recordCount>
    <cfset result.schema = schema>
    <cfset result.debug = { plan=plan, aiSql=aiSql, requestId=requestId }>
    <cfif len(debugMsg)>
        <cfset result.debug.message = debugMsg>
    </cfif>
    <cfoutput>#serializeJSON(result)#</cfoutput>
    <cfcatch>
        <cflog type="error" text="requestId=#requestId# message=#cfcatch.message# stacktrace=#cfcatch.stacktrace#"/>
        <cfoutput>#serializeJSON({error="Unexpected server error", details=cfcatch.message, debug={requestId=requestId}})#</cfoutput>
    </cfcatch>
</cftry>
<cfabort>
