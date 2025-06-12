# Codex CFML Demo

This project is a simple CFML application showcasing an AI agent that generates SQL queries from natural language questions.

## Requirements

- A CFML engine with AI session support (tested with **Lucee 6**).
- A configured datasource that the application can query.
- A browser with JavaScript enabled to view the interface.

## Running the application

1. Deploy the `.cfm` files to your CFML server.
2. Ensure the datasource for your database is configured on the server.
3. Set a cookie named `cooksql_mainsync` with the base name of the datasource. The application appends `_active` to this value when executing queries.
4. Open `index.cfm` in your browser and ask a question about the data.
5. Each session remembers only the last 20 exchanges to limit memory usage.

## Debug logs

Any debug output from the AI agent is sent back in the JSON response under the `debug` key. The front‑end displays these messages in the **Debug Log** box beneath the chat and also logs them to the browser console. Use this information to inspect the generated SQL and the planner output.

## Troubleshooting

### "AI did not generate valid SQL"

If the AI fails to return a proper `SELECT` statement, the server responds with the message **"AI did not generate valid SQL"**. Inspect the returned `debug` object in the browser console or the Debug Log box to see the raw text produced by the AI. Adjust your question and try again.

### Viewing debug output

The Debug Log box keeps a running log of console messages. You can also open your browser's developer tools to see the same log entries. Use the **Copy Log** button to copy the contents for further inspection.
