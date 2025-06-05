<cfif structKeyExists(form, "username")>
    <cfset valid = form.username EQ "admin" AND form.password EQ "password">
    <cfif valid>
        <cfset session.loggedIn = true>
        <cflocation url="index.cfm" addtoken="false">
    <cfelse>
        <cfset msg = "Invalid credentials" />
    </cfif>
</cfif>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Login</title>
</head>
<body>
    <cfif isDefined("msg")><p style="color:red;">#msg#</p></cfif>
    <form method="post">
        <label>Username: <input type="text" name="username" required></label><br>
        <label>Password: <input type="password" name="password" required></label><br>
        <button type="submit">Login</button>
    </form>
</body>
</html>
