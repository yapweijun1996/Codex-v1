# AI SQL Agent Setup

This project uses several configuration files to customize behavior:

- `schema_config.json` – Defines available database tables, columns, and business rules.
- `ai_agent_chart_config.json` – Chart.js presets used when rendering charts.
- `ai_agent_totals_config.json` – Rules for calculating totals and auto summaries.

## Running
1. Install a CFML engine such as Lucee.
2. Place these files in the web root and configure your database connection via the `cooksql_mainsync` cookie or server settings.
3. Open `index.cfm` in your browser and start asking questions.

The UI is mobile‑responsive and includes controls for clearing or resetting the chat history and toggling debug output.

