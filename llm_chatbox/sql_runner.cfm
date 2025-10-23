<cfsetting enablecfoutputonly="true">
<cfcontent type="application/json; charset=utf-8">

<cftry>
	<cfparam name="form.sql" default="">
	<cfparam name="url.sql" default="">
	<cfset rawSql = trim(len(form.sql) ? form.sql : url.sql)>

	<cfif !len(rawSql)>
		<cfoutput>#serializeJSON({ok=false, error="Missing SQL statement."})#</cfoutput><cfabort>
	</cfif>

	<!--- Allow trailing semicolons but forbid multiple statements or non-SELECT verbs --->
	<cfset cleanedSql = rereplace(rawSql, ";+\s*$", "", "all")>
	<cfif !refindnocase("(?s)^\s*select\b", cleanedSql)>
		<cfoutput>#serializeJSON({ok=false, error="Only SELECT statements are permitted."})#</cfoutput><cfabort>
	</cfif>
	<cfif refind(";\s*", cleanedSql)>
		<cfoutput>#serializeJSON({ok=false, error="Multiple SQL statements are not allowed."})#</cfoutput><cfabort>
	</cfif>

	<!--- Optional safeguard against write operations keywords --->
	<cfif refindnocase("\b(insert|update|delete|merge|drop|alter|truncate)\b", cleanedSql)>
		<cfoutput>#serializeJSON({ok=false, error="Detected non-read operation keyword."})#</cfoutput><cfabort>
	</cfif>

	<cfset maxRows = 200>

	<cfquery name="qData" datasource="pos5h_v57uonlinedb_active" timeout="30" maxrows="#maxRows#">
		#preserveSingleQuotes(cleanedSql)#
	</cfquery>

	<cfset columns = listToArray(qData.columnList)>
	<cfset rows = []>

	<cfloop query="qData">
		<cfset row = {} />
		<cfloop array="#columns#" index="col">
			<cfset row[col] = qData[col] />
		</cfloop>
		<cfset arrayAppend(rows, row)>
	</cfloop>

	<cfset response = {
		ok = true,
		rowCount = qData.recordCount,
		columns = columns,
		rows = rows,
		maxRows = maxRows
	}>

	<cfoutput>#serializeJSON(response)#</cfoutput>
<cfcatch type="any">
	<cfheader statuscode="500" statustext="SQL Error">
	<cfoutput>#serializeJSON({
		ok = false,
		error = cfcatch.message,
		detail = cfcatch.detail,
		where = cfcatch.where
	})#</cfoutput>
</cfcatch>
</cftry>
