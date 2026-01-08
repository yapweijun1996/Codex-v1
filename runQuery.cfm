<cfcontent type="application/json" />
<cfheader name="Access-Control-Allow-Origin" value="*" />
<cfparam name="url.sql" default="" />
<cfif NOT len(url.sql)>
    <cfoutput>#serializeJSON({"error":"Missing SQL"})#</cfoutput>
    <cfabort>
</cfif>
<cfif NOT reFindNoCase("^\s*select", url.sql)>
    <cfoutput>#serializeJSON({"error":"Only SELECT statements are allowed"})#</cfoutput>
    <cfabort>
</cfif>
<!--- Attempt SQL execution --->
<cfset sqlOut = url.sql />
<cftry>
<cfquery name="q" datasource="analytics" timeout="30">
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
    <cfoutput>#serializeJSON({rows:rows})#</cfoutput>
    <cfcatch>
        <cfset err = cfcatch.message>
        <cfif structKeyExists(cfcatch,"detail")>
            <cfset err = err & " - " & cfcatch.detail>
        </cfif>
        <cfoutput>#serializeJSON({error:err,sql:sqlOut})#</cfoutput>
    </cfcatch>
</cftry>
