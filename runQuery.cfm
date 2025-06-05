<cfcontent type="application/json" />
<cfheader name="Access-Control-Allow-Origin" value="*" />
<cfparam name="url.sql" default="" />
<cfif NOT len(url.sql)>
    <cfoutput>#serializeJSON({"error":"Missing SQL"})#</cfoutput>
    <cfabort>
</cfif>
<!--- Attempt SQL execution --->
<cfset sqlOut = url.sql />
<cfif NOT structKeyExists(application,"queryCache")>
    <cfset application.queryCache = structNew()>
</cfif>
<cfset cacheKey = hash(sqlOut)>
<cfif structKeyExists(application.queryCache, cacheKey) AND application.queryCache[cacheKey].expires GT now()>
    <cflog file="ai_agent" text="Cache hit for SQL" type="information" />
    <cfoutput>#serializeJSON(application.queryCache[cacheKey].data)#</cfoutput>
    <cfabort>
</cfif>
<cflog file="ai_agent" text="Execute SQL: #sqlOut#" type="information" />
<cftry>
    <cfquery name="q" datasource="#cookie.cooksql_mainsync#_active" timeout="30">
        #preserveSingleQuotes(sqlOut)#
    </cfquery>
    <cfset rows = []>
    <cfloop query="q">
        <cfset row = structNew()>
        <cfloop list="#q.columnList#" index="c">
            <cfset row[c] = q[c][currentRow]>
        </cfloop>
        <cfset arrayAppend(rows,row)>
    </cfloop>
    <cfset application.queryCache[cacheKey] = {data:{rows:rows}, expires:now()+createTimeSpan(0,0,5,0)}>

    <cflog file="ai_agent" text="Cache store for SQL" type="information" />
    <cfoutput>#serializeJSON({rows:rows})#</cfoutput>
    <cflog file="ai_agent" text="SQL rows returned: #arrayLen(rows)#" type="information" />
    <cfcatch>
        <cflog file="ai_agent" text="SQL error: #cfcatch.message#" type="error" />
        <cfoutput>#serializeJSON({error:cfcatch.message})#</cfoutput>
    </cfcatch>
</cftry>
