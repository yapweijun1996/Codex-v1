<cfsetting enablecfoutputonly="true">
<cfcontent type="application/json">

<!---
    Simplified AI backend for prompt-to-SQL generation and data summarization.
    This script exposes several helper functions and a single handler that
    returns JSON for use in a chat-based interface.
--->

<cfscript>
/**
 * loadSchema
 * Purpose : Read schema_config.json and return as struct
 * Output  : struct describing tables and columns
 */
function loadSchema(){
    return deserializeJSON(fileRead(expandPath("./schema_config.json")));
}

/**
 * buildSchemaSummary
 * Purpose : Create a short text summary of table names and sample columns
 * Input   : schema struct
 * Output  : string summary for AI context
 */
function buildSchemaSummary(schema){
    var txt = "";
    for(var t in schema){
        if(structKeyExists(schema[t],"columns")){
            var cols = structKeyArray(schema[t].columns);
            txt &= t & " (" & arrayToList(arraySlice(cols,1,5),", ") & ")\n";
        }
    }
    return txt;
}

/**
 * classifyIntent
 * Purpose : Decide whether the user needs a new SQL query
 * Input   : question string, history array, schema summary string
 * Output  : "sql", "use_previous_results" or "chat"
 */
function classifyIntent(question, history, summary){
    var systemMsg = "Classify as 'sql', 'use_previous_results', or 'chat'." &
        " If the last result can answer the question, return 'use_previous_results'." &
        " Schema:\n" & summary;
    var ses = LuceeCreateAISession(name="gpt002", systemMessage=systemMsg);
    var resp = LuceeInquiryAISession(ses, question);
    var intent = trim(resp);
    if(intent neq "sql" && intent neq "use_previous_results" && intent neq "chat")
        intent = "chat";
    return intent;
}

/**
 * generateSQL
 * Purpose : Ask the AI model to create a safe SELECT query
 * Input   : question string, schema summary string
 * Output  : struct {sql="..."}
 */
function generateSQL(question, summary){
    var prompt = "You generate PostgreSQL SELECT SQL using only tables and columns below." &
        " Always include LIMIT 10 if none specified. Return JSON {\"sql\":\"...\"}.\n" &
        summary;
    var ses = LuceeCreateAISession(name="gpt002", systemMessage=prompt);
    var resp = LuceeInquiryAISession(ses, question);
    var data = {};
    try{ data = deserializeJSON(resp); } catch(any e){ data = {sql=resp}; }
    return data;
}

/**
 * validateSQL
 * Purpose : Ensure SQL is read-only and references known tables
 * Input   : sql string, schema struct
 * Output  : boolean true if safe
 */
function validateSQL(sql, schema){
    if(!isSimpleValue(sql)) return false;
    if(!reFindNoCase("^\s*select", sql)) return false;
    if(reFindNoCase("\b(update|delete|insert|drop|alter)\b", sql)) return false;
    var allowed = structKeyArray(schema);
    var tables = reMatchNoCase("from\s+([a-z0-9_]+)", sql);
    for(var t in tables){
        var tbl = trim(replace(t, "from", "", "all"));
        if(len(tbl) && !arrayContainsNoCase(allowed, tbl)) return false;
    }
    return true;
}

/**
 * executeSQL
 * Purpose : Run the SQL and return query results
 * Input   : sql string
 * Output  : query object
 */
function executeSQL(sql){
    return queryExecute(sql, {}, {
        datasource = cookie.cooksql_mainsync & "_active",
        timeout = 20
    });
}

/**
 * summarizeResults
 * Purpose : Provide an English explanation of the query output
 * Input   : query object, question string
 * Output  : summary string
 */
function summarizeResults(data, question){
    var prompt = "Summarize these results:\n" & serializeJSON(data);
    var ses = LuceeCreateAISession(name="gpt002", systemMessage=prompt);
    return LuceeInquiryAISession(ses, question);
}

/**
 * makeChartData
 * Purpose : Basic chart suggestion using first two columns if numeric
 * Input   : query object
 * Output  : struct for Chart.js {type, labels, datasets}
 */
function makeChartData(data){
    var chart = { type: "table", labels: [], datasets: [] };
    if(arrayLen(data.columnList) GTE 2 && arrayLen(data[data.columnList[1]])>0){
        var secondCol = data.columnList[2];
        if(isNumericArray(data[secondCol])){
            chart.type = "bar";
            chart.labels = data[data.columnList[1]];
            chart.datasets = [ { label: secondCol, data: data[secondCol] } ];
        }
    }
    return chart;
}

/**
 * loadHistory / saveHistory
 * Purpose : Manage conversation history in session scope
 */
function loadHistory(){
    if(!structKeyExists(session,"chatHistory")) session.chatHistory=[];
    return session.chatHistory;
}

function saveHistory(h){ session.chatHistory = h; }
</cfscript>

<!--- Main handler logic --->
<cfscript>
var question = trim(paramValue("form.msg", paramValue("url.msg","")));
if(!len(question)){
    writeOutput(serializeJSON({error="No question provided."}));
    abort;
}
if(!isDefined("cookie.cooksql_mainsync")){
    writeOutput(serializeJSON({error="Database not configured."}));
    abort;
}

var schema = loadSchema();
var summary = buildSchemaSummary(schema);
var history = loadHistory();
var intent = classifyIntent(question, history, summary);

var response = {history=history};
var lastData = structKeyExists(session,"lastData") ? session.lastData : "";

if(intent eq "sql"){
    var ai = generateSQL(question, summary);
    var sql = trim(ai.sql ?: "");
    if(!validateSQL(sql, schema)){
        writeOutput(serializeJSON({error="Invalid SQL generated", debug=sql}));
        abort;
    }
    try{
        var data = executeSQL(sql);
        var summaryText = summarizeResults(data, question);
        var chart = makeChartData(data);
        response.summary = summaryText;
        response.chartData = chart;
        response.rawData = data;
        response.sql = sql;
        arrayAppend(history,{prompt=question,sql=sql,ts=now()});
        session.lastData = data;
    }catch(any e){
        writeOutput(serializeJSON({error="Query failed", debug=e.message}));
        abort;
    }
}else if(intent eq "use_previous_results" && isQuery(lastData)){
    var summaryText = summarizeResults(lastData, question);
    var chart = makeChartData(lastData);
    response.summary = summaryText;
    response.chartData = chart;
    response.rawData = lastData;
    arrayAppend(history,{prompt=question,info="used previous results",ts=now()});
}else{
    response.summary = "I can help with data questions or summaries.";
    arrayAppend(history,{prompt=question,info="chat",ts=now()});
}

saveHistory(history);
response.history = history;
writeOutput(serializeJSON(response));
</cfscript>

