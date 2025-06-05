# Analytics Chat Demo

This demo shows a simple AI-powered chat interface that can decide when to run SQL queries. The backend is built with Lucee CFML.

## Setup

1. Create a datasource in Lucee called `analytics`.
2. Ensure the datasource contains a table called `sales`:
   ```sql
   CREATE TABLE sales (
     id INT PRIMARY KEY,
     date DATE,
     amount DECIMAL(10,2),
     customer_name VARCHAR(255)
   );
   ```
   Insert some sample data for testing, e.g.:
   ```sql
   INSERT INTO sales (id, date, amount, customer_name) VALUES
     (1,'2010-01-15',100.00,'Alice'),
     (2,'2010-06-20',200.50,'Bob');
   ```

## Files

- `index.cfm` – Frontend chat UI with a debug panel.
- `ask.cfm` – Calls the AI agent using Lucee's built-in functions.
- `runQuery.cfm` – Executes SQL sent from the agent.
- `agent_prompt_example.md` – Example system prompt for the AI agent.

Open `index.cfm` in your browser after configuring the datasource.
