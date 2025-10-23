<cfset schemaPath = expandPath("./database_relation_schema.json")>
<cfif !fileExists(schemaPath)>
	<cfoutput>#serializeJSON({error="Missing schema_config.json."})#</cfoutput><cfabort>
</cfif>
<cfset schemaString = fileRead(schemaPath)>
<cfset parsedSchema = deserializeJSON(schemaString)>

<!--- Serialize transaction_types struct to JSON string --->
<cfset jsonString = serializeJSON(parsedSchema.transaction_types)>

<!--- Output as text --->
 <cfoutput>#jsonString#</cfoutput>

<!--- Loop over tables and dump name and description only --->
<cfloop array="#parsedSchema.tables#" index="tbl">
  <cfoutput>
    <h3>Table: #tbl.name#</h3>
    <p>Description: #tbl.description#</p>
    <p>Filters:</p>
    <ul>
      <cfloop array="#tbl.filters#" index="filter">
        <li>#filter.field# = #serializeJSON(filter.value)#</li>
      </cfloop>
    </ul>
  </cfoutput>
</cfloop>



<cfset tableAgentSchema = []>

<cfloop array="#parsedSchema.tables#" index="tbl">
  <cfset arrayAppend(tableAgentSchema, {
    name = tbl.name,
    description = tbl.description,
    filters = tbl.filters
  })>
</cfloop>

<cfset jsonOutput = serializeJSON(tableAgentSchema)>


<cfset filteredSchema = []>
<cfset tableAgentResult = '{"tables": [{"table":"scm_sal_main"},{"table":"scm_sal_data"}]}'>
<cfset parsedResult = deserializeJSON(tableAgentResult)>

<!--- Access array of selected tables --->
<cfset selectedTables = parsedResult.tables>

<!--- Collect matched tables info --->
<cfloop array="#selectedTables#" index="tbl">
					<cfset temp_table = tbl.table>
					<cfloop array="#parsedSchema.tables#" index="schemaTable">
						<cfif schemaTable.name eq temp_table>
							<cfset arrayAppend(filteredSchema, {
								name = schemaTable.name,
								description = schemaTable.description,
								fields = schemaTable.fields,
								common_queries = schemaTable.COMMON_QUERIES,
								filters = schemaTable.filters
							})>
						</cfif>
					</cfloop>
				</cfloop>

<!--- Serialize to JSON string --->
<cfset jsonFilteredSchema = serializeJSON(filteredSchema)>

<!--- Output JSON --->
<cfoutput>
<pre>#jsonFilteredSchema#</pre>
</cfoutput>

