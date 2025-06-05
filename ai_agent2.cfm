<cfsetting enablecfoutputonly="true">
<cfcontent type="application/json">

<!-- basic validation -->
<cfparam name="form.msg" default="">
<cfset q = trim(form.msg)>
<cfif NOT len(q)>
    <cfoutput>{"error":"No question provided."}</cfoutput><cfabort>
</cfif>

<cfif NOT isDefined("cookie.cooksql_mainsync")>
    <cfoutput>{"error":"Database not configured."}</cfoutput><cfabort>
</cfif>

<!-- simple rule based SQL generation -->
<cfset table = "scm_sal_main">
<cfif findNoCase("purchase", q)>
    <cfset table = "scm_pur_main">
</cfif>
<cfset sql = "SELECT * FROM " & table & " WHERE tag_deleted_yn = 'n' LIMIT 10">
<cfif findNoCase("total", q)>
    <cfset sql = "SELECT SUM(nettot_forex) AS total, curr_short_forex FROM " & table & " WHERE tag_deleted_yn = 'n' GROUP BY curr_short_forex LIMIT 10">
</cfif>

<!-- try running query -->
<cftry>
    <cfquery name="data" datasource="#cookie.cooksql_mainsync#_active" timeout="20">
        #preserveSingleQuotes(sql)#
    </cfquery>
    <cfset tableHtml = "<table border='1'><tr>" & arrayToList(data.columnList,"</tr><tr><td>") & "</td></tr>" & ""></cfset>
    <!-- convert query to HTML -->
    <cfset tableHtml = "<table border='1'><tr>" & arrayToList(listToArray(data.columnList),"</th><th>") & "</th></tr>">
    <cfloop query="data">
        <cfset row = "">
        <cfloop list="#data.columnList#" index="col">
            <cfset row &= "<td>" & htmlEditFormat(data[col][currentRow]) & "</td>">
        </cfloop>
        <cfset tableHtml &= "<tr>" & row & "</tr>">
    </cfloop>
    <cfset tableHtml &= "</table>">
    <cfoutput>
    {"summary":"Results for '#encodeForHTML(q)#'","table": "#tableHtml#","sql":"#encodeForHTML(sql)#"}
    </cfoutput>
    <cfcatch>
        <cfoutput>{"error":"Query failed","debug":"#cfcatch.message#"}</cfoutput>
    </cfcatch>
</cftry>
