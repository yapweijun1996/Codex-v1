<cfcontent type="application/json" />
<cfheader name="Access-Control-Allow-Origin" value="*" />
<cfparam name="form.msg" default="" />
<cfparam name="url.msg" default="" />
<cfset userMsg = len(form.msg) ? form.msg : url.msg />
<cfif NOT len(userMsg)>
    <cfoutput>#serializeJSON({"error":"Missing message"})#</cfoutput>
    <cfabort>
</cfif>
<cfset systemPrompt = fileRead(expandPath('./agent_prompt_example.md')) />
<cfset chatPrompt = systemPrompt>
<cfset chatSession = LuceeCreateAISession(name="gpt002", systemMessage=chatPrompt) />
<cfset aiReply = LuceeInquiryAISession(chatSession, userMsg) />
<cftry>
    <cfset result = deserializeJSON(aiReply) />
    <cfoutput>#serializeJSON(result)#</cfoutput>
    <cfcatch>
        <cfoutput>#serializeJSON({"error":"Invalid AI response","raw":aiReply})#</cfoutput>
    </cfcatch>
</cftry>
