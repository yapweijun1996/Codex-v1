<cfsetting enablecfoutputonly="true">
<cfcontent type="application/json">

<cftry>
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

	<cfset aiPrompt =
	"You are an expert business analyst and SQL developer.
	
	Given the following database schema (in JSON), and a user's business question:
	- **Choose the best table (or tables) to answer the question**
	- **Select only relevant columns for the result**
	- **Write a PostgreSQL SELECT statement using these choices**
	- **Always use: WHERE tag_deleted_yn = 'n'**
	- **Always use LIMIT 20**
	- **If more than one table is relevant, use JOIN as needed**
	- **Respond ONLY with the SQL (no explanations or comments)**
	
	Database schema:
	```json
	" & schemaString & "
	```">
	
	<cfset aiSession = LuceeCreateAISession(name="gpt001", systemMessage=aiPrompt)>
	<cfset aiSql = LuceeInquiryAISession(aiSession, userMsg)>

   
    <!--- 5. Clean the SQL (grab only SELECT statement) --->
    <cfset sql = "">
    <cfif refindnocase("^select\s", aiSql)>
        <cfset sql = aiSql>
    <cfelse>
        <cfset m = rematchnocase("select\s.+?(?=;|\s*$)", aiSql)>
        <cfif arraylen(m)> <cfset sql = trim(m[1])> </cfif>
    </cfif>
    <cfif NOT len(sql) OR NOT refindnocase("^select\s", sql)>
        <cfoutput>#serializeJSON({error="AI did not generate valid SQL", debug=aiSql})#</cfoutput><cfabort>
    </cfif>

    <!--- 6. Execute SQL --->
    <cftry>
        <cfquery name="data" datasource="#cookie.cooksql_mainsync#_active" timeout="20">
            #preserveSingleQuotes(sql)#
        </cfquery>
        <cfcatch>
            <cfoutput>#serializeJSON({error="SQL execution failed", details=cfcatch.message, sql=sql})#</cfoutput><cfabort>
        </cfcatch>
    </cftry>

    <!--- 7. Prepare HTML table --->
    <cfset prettyTable = "">
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

        <cfset prettyTable &= "</table>">
        <cfset prettyTable &= "</div>">
    <cfelse>
        <cfset prettyTable = "No records found.">
    </cfif>

    <!--- Generate AI summary of the results --->
    <cfset summary = "Found #data.recordCount# records.">
    <cfset aiSummary = "">
    <cftry>
        <cfset summaryPrompt = "You are an expert business analyst summarizer.\n\n" &
            "User question: " & userMsg & "\n\n" &
            "SQL statement executed:\n" & sql & "\n\n" &
            "HTML table:\n" & prettyTable & "\n\n" &
            "Provide a short summary in no more than 3 sentences that helps a business user understand the results." >
        <cfset summarySession = LuceeCreateAISession(name="gpt_summary", systemMessage=summaryPrompt)>
        <cfset aiSummary = LuceeInquiryAISession(summarySession, "Summarize the results")>
        <cfif len(trim(aiSummary))>
            <cfset summary = aiSummary>
        </cfif>
        <cfcatch>
            <!--- If summarization fails, fall back to basic summary --->
        </cfcatch>
    </cftry>
    <cfoutput>
    #serializeJSON({
        summary = summary,
        sql = sql,
        schema = schema,
        table = prettyTable,
        rowCount = data.recordCount,
        debug = { aiPrompt = aiPrompt, aiSql = aiSql, aiSummary = aiSummary }
    })#
    </cfoutput>
    <cfcatch>
        <cfoutput>#serializeJSON({error="Unexpected server error", details=cfcatch.message})#</cfoutput>
    </cfcatch>
</cftry>
<cfabort>
