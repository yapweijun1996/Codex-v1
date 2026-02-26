---
name: browser_js
description: Execute dynamic JavaScript in the browser
---

# Browser JS Executor

This skill gives you the ability to execute JavaScript code directly in the user's browser. This is extremely powerful and allows you to bridge the gap between static knowledge and dynamic web capabilities.

## When to use
- When you need to fetch data from an API that doesn't have a dedicated tool.
- When you need to perform complex calculations or data processing.
- When you encounter a task that requires a script but the "node" environment is unavailable (since you are in the browser).

## How to use
Use the `run_javascript` tool.
- **Async is supported**: You can use `await fetch(...)`.
- **Return is mandatory**: You MUST write `return variableName` at the end of your code to see the result.
- **No Console**: Console logs are invisible to you. Use `return`.

## Examples

### Fetching Exchange Rates (Frankfurter API)
If the user asks for exchange rates and the native tool is missing:
```javascript
const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=SGD');
const data = await response.json();
return data;
```

### Complex Math
```javascript
const radius = 5.5;
return Math.PI * radius * radius;
```
