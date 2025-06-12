<!-- CFML helper functions for AI agents -->

<cffunction name="planAgents" output="false" returnType="struct">
    <cfargument name="userMsg" type="string" required="true">
    <!--- Simple planner always uses all agents --->
    <cfset var plan = { database=true, table=true, summary=true }>
    <cfreturn plan>
</cffunction>

<cffunction name="generateSQL" output="false" returnType="string">
    <cfargument name="schemaString" type="string" required="true">
    <cfargument name="userMsg" type="string" required="true">
    <cfset var aiPrompt = "You are an expert business analyst and SQL developer.\n\n" &
        "Given the following database schema (in JSON), and a user's business question:" &
        "- Choose the best table (or tables) to answer the question" &
        "- Select only relevant columns for the result" &
        "- Write a PostgreSQL SELECT statement using these choices" &
        "- Always use: WHERE tag_deleted_yn = 'n'" &
        "- Always use LIMIT 20" &
        "- If more than one table is relevant, use JOIN as needed" &
        "- Respond ONLY with the SQL (no explanations or comments)" &
        "\n\nDatabase schema:\n```json\n" & arguments.schemaString & "\n```">
    <cfset var aiSession = LuceeCreateAISession(name="gpt001", systemMessage=aiPrompt)>
    <cfset var aiSql = LuceeInquiryAISession(aiSession, arguments.userMsg)>
    <!--- Extract first SELECT statement --->
    <cfset var sql = "">
    <cfif refindnocase("^select\\s", aiSql)>
        <cfset sql = aiSql>
    <cfelse>
        <cfset var m = rematchnocase("select\\s.+?(?=;|\\s*$)", aiSql)>
        <cfif arraylen(m)> <cfset sql = trim(m[1])> </cfif>
    </cfif>
    <cfreturn sql>
</cffunction>

<cffunction name="renderTable" output="false" returnType="string">
    <cfargument name="data" type="query" required="true">
    <cfset var tableHTML = "">
    <cfif arguments.data.recordCount>
        <cfset var sums = structNew()>
        <cfloop list="#arguments.data.columnlist#" index="col">
            <cfset sums[col] = 0>
        </cfloop>
        <cfset tableHTML &= "<div style='max-height: 200px;overflow: auto;'>">
        <cfset tableHTML &= "<table class='biz-table'><thead><tr>">
        <cfloop list="#arguments.data.columnlist#" index="col">
            <cfset tableHTML &= "<th">#encodeForHTML(col)#</th>">
        </cfloop>
        <cfset tableHTML &= "</tr></thead><tbody>">
        <cfloop query="arguments.data">
            <cfset tableHTML &= "<tr>">
            <cfloop list="#arguments.data.columnlist#" index="col">
                <cfset val = arguments.data[col]>
                <cfif isNumeric(val)>
                    <cfset sums[col] = sums[col] + val>
                </cfif>
                <cfset tableHTML &= "<td>" & encodeForHTML(val) & "</td>">
            </cfloop>
            <cfset tableHTML &= "</tr>">
        </cfloop>
        <cfset tableHTML &= "</tbody><tfoot><tr>">
        <cfloop list="#arguments.data.columnlist#" index="col">
            <cfif isNumeric(sums[col]) AND sums[col] NEQ 0>
                <cfset tableHTML &= "<td>" & encodeForHTML(sums[col]) & "</td>">
            <cfelse>
                <cfset tableHTML &= "<td></td>">
            </cfif>
        </cfloop>
        <cfset tableHTML &= "</tr></tfoot></table></div>">
    <cfelse>
        <cfset tableHTML = "No records found.">
    </cfif>
    <cfreturn tableHTML>
</cffunction>

<cffunction name="summarizeResults" output="false" returnType="string">
    <cfargument name="userMsg" type="string" required="true">
    <cfargument name="sql" type="string" required="true">
    <cfargument name="tableHTML" type="string" required="true">
    <cfset var summaryPrompt = "You are an expert business analyst summarizer." &
        "\n\nUser question: " & arguments.userMsg &
        "\n\nSQL statement executed:\n" & arguments.sql &
        "\n\nHTML table:\n" & arguments.tableHTML &
        "\n\nProvide a short summary in no more than 3 sentences that helps a business user understand the results." >
    <cfset var summarySession = LuceeCreateAISession(name="gpt001", systemMessage=summaryPrompt)>
    <cfset var aiSummary = LuceeInquiryAISession(summarySession, "Summarize the results")>
    <cfreturn aiSummary>
</cffunction>

<cffunction name="formatConversation" output="false" returnType="struct">
    <cfargument name="summary" type="string" required="true">
    <cfargument name="sql" type="string" required="false" default="">
    <cfargument name="table" type="string" required="false" default="">
    <cfreturn { SUMMARY=arguments.summary, SQL=arguments.sql, TABLE=arguments.table }>
</cffunction>

