<cfcontent type="application/json" />
<cfheader name="Access-Control-Allow-Origin" value="*" />
<cfparam name="form.msg" default="" />
<cfparam name="url.msg" default="" />
<cfset userMsg = len(form.msg) ? form.msg : url.msg />
<cflog file="ai_agent" text="User query: #userMsg#" type="information" />
<cfif NOT len(userMsg)>
    <cfoutput>#serializeJSON({"error":"Missing message"})#</cfoutput>
    <cfabort>
</cfif>

<!--- Load schema and build summary for AI --->
<cfset schema = deserializeJSON(fileRead(expandPath('./schema_config.json')))> 
<cfset schemaSummary = "">
<cfloop collection="#schema#" item="tbl">
    <cfif isStruct(schema[tbl])>
        <cfset cols = structKeyList(schema[tbl]["columns"], ", ")>
        <cfset schemaSummary &= "- " & tbl & "(" & cols & ")\n">
        <cfif structKeyExists(schema[tbl], "document_types")>
            <cfset schemaSummary &= "  doc_types: " & structKeyList(schema[tbl]["document_types"], ", ") & "\n">
        </cfif>
    </cfif>
</cfloop>
<cfset rulesSummary = "">
<cfloop collection="#schema#" item="tbl">
    <cfif structKeyExists(schema[tbl], "business_rules")> 
        <cfset rulesSummary &= "* " & tbl & ": " & arrayToList(schema[tbl]["business_rules"], "; ") & "\n">
    </cfif>
</cfloop>

<!--- Maintain chat history and AI-generated summary --->
<cfif NOT structKeyExists(session,"chatHistory")>
    <cfset session.chatHistory = []>
</cfif>
<cfif NOT structKeyExists(session,"chatSummary")>
    <cfset session.chatSummary = "">
</cfif>
<cfset arrayAppend(session.chatHistory,{role:"user",content:userMsg})>

<cfset systemPrompt = fileRead(expandPath('./agent_prompt_example.md')) & chr(10) & "Schema:\n" & schemaSummary & "Business Rules:\n" & rulesSummary>
<cfif len(session.chatSummary)>
    <cfset systemPrompt &= "Conversation summary so far: " & session.chatSummary & chr(10)>
</cfif>

<cfset chatPrompt = systemPrompt>
<cfset chatSession = LuceeCreateAISession(name="gpt002", systemMessage=chatPrompt) />
<cfset aiReply = LuceeInquiryAISession(chatSession, userMsg) />
<cftry>
    <cfset result = deserializeJSON(aiReply) />
    <cfset arrayAppend(session.chatHistory,{role:"assistant",content:result.response})>
    <!--- Generate/update chat summary every 5 exchanges --->
    <cfif arrayLen(session.chatHistory) GTE 6>
        <cfset summarySession = LuceeCreateAISession(name="gpt002", systemMessage="Summarize this conversation briefly:")>
        <cfset session.chatSummary = LuceeInquiryAISession(summarySession, serializeJSON(session.chatHistory))>
        <!--- Keep last 6 messages only --->
        <cfset session.chatHistory = arraySlice(session.chatHistory, arrayLen(session.chatHistory)-5, 6)>
    </cfif>
    <cfoutput>#serializeJSON(result)#</cfoutput>
    <cflog file="ai_agent" text="AI result: #aiReply#" type="information" />
    <cfcatch>
        <cflog file="ai_agent" text="Invalid AI response: #aiReply#" type="error" />
        <cfoutput>#serializeJSON({"error":"Invalid AI response","raw":aiReply})#</cfoutput>
    </cfcatch>
</cftry>
