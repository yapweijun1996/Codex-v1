<cfsetting enablecfoutputonly="true">
<cfcontent type="application/json">
<cfinclude template="agents.cfm">

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
        <cfoutput>#serializeJSON({error="No question provided."})#</cfoutput><cfabort>
    </cfif>

    <!--- 2. Load schema config --->
    <cfset schemaPath = expandPath("./schema_config.json")>
    <cfif not fileExists(schemaPath)>
        <cfoutput>#serializeJSON({error="Missing schema_config.json."})#</cfoutput><cfabort>
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
        <cfset aiSql = generateSQL(schemaString, userMsg)>
        <cfset sql = aiSql>
        <cfif NOT len(sql) OR NOT refindnocase("^select\\s", sql)>
            <cfoutput>#serializeJSON({error="AI did not generate valid SQL", debug=aiSql})#</cfoutput><cfabort>
        </cfif>
        <cftry>
            <cfquery name="data" datasource="#cookie.cooksql_mainsync#_active" timeout="20">
                #preserveSingleQuotes(sql)#
            </cfquery>
            <cfcatch>
                <cfoutput>#serializeJSON({error="SQL execution failed", details=cfcatch.message, sql=sql})#</cfoutput><cfabort>
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
        <cfset summary = summarizeResults(userMsg, sql, prettyTable)>
    <cfelseif plan.database>
        <cfset summary = "Found #data.recordCount# records.">
    </cfif>

    <!--- Conversation agent --->
    <cfset result = formatConversation(summary, sql, prettyTable)>
    <cfset arrayAppend(session.history, { user=userMsg, summary=summary, sql=sql, table=prettyTable })>
    <cfset result.history = session.history>
    <cfset result.rowCount = data.recordCount>
    <cfset result.schema = schema>
    <cfset result.debug = { plan=plan, aiSql=aiSql }>
    <cfif len(debugMsg)>
        <cfset result.debug.message = debugMsg>
    </cfif>
    <cfoutput>#serializeJSON(result)#</cfoutput>
    <cfcatch>
        <cfoutput>#serializeJSON({error="Unexpected server error", details=cfcatch.message})#</cfoutput>
    </cfcatch>
</cftry>
<cfabort>
