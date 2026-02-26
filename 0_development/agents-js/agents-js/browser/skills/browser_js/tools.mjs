const RiskLevel = { HIGH: 3 };

const tools = [
    {
        name: "run_javascript",
        description: "Executes JavaScript code directly in the browser. Use this to perform calculations, verify logic, or fetch data from public APIs (CORS enabled). The code runs in an async function context, so you can use 'await'. You MUST 'return' the final result. RECOMMENDED APIs: For Exchange Rates, use 'https://api.frankfurter.app/latest?from=USD&to=SGD'.",
        risk: RiskLevel.HIGH,
        meta: {
            // Avoid showing code content in UI; only show size.
            intentTemplate: 'run javascript ({code_len} chars)',
        },
        parameters: {
            type: "object",
            properties: {
                code: {
                    type: "string",
                    description: "The JavaScript code to execute. Example: 'const res = await fetch(\"https://api.frankfurter.app/latest?from=USD&to=SGD\"); return await res.json();'"
                }
            },
            required: ["code"]
        },
        func: async ({ code }) => {
            try {
                // Create a dynamic async function from the code string
                const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
                const func = new AsyncFunction(code);

                // Execute and wait for result
                const result = await func();

                // Return raw object so Gemini API can parse it correctly
                return result;
            } catch (error) {
                return { error: `Error executing code: ${error.message}` };
            }
        }
    }
];

export default tools;
export { tools };
