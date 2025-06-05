<cfset structDelete(session, "loggedIn")>
<cflocation url="login.cfm" addtoken="false">
