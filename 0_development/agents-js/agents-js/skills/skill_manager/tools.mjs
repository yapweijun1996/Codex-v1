const tools = [
    {
        name: "list_available_skills",
        description: "List all available skills (APIs/Knowledge) that you can learn from. Use this when you are unsure how to perform a task.",
        parameters: { type: "object", properties: {}, required: [] },
        func: async () => {
            const response = await fetch('./skills-manifest.json');
            const skills = await response.json();
            // Return raw directory names (id) so subsequent fetches work correctly
            return skills.map(s => ({
                name: s.id,
                description: `Skill for ${s.name} (${s.id}). Read docs for details.`
            }));
        }
    },
    {
        name: "read_skill_documentation",
        description: "Read the detailed documentation (SKILL.md) for a specific skill. This will teach you how to use the API (URL, parameters, etc) via run_javascript.",
        parameters: {
            type: "object",
            properties: {
                skill_name: {
                    type: "string",
                    description: "The name of the skill to read (e.g. 'onemap_postcode')"
                }
            },
            required: ["skill_name"]
        },
        func: async ({ skill_name }) => {
            try {
                const response = await fetch(`./skills/${skill_name}/SKILL.md`);
                if (!response.ok) throw new Error("Skill documentation not found.");
                const text = await response.text();
                // Remove frontmatter to save tokens
                return text.replace(/^---[\s\S]*?---/, '').trim();
            } catch (error) {
                return `Error reading documentation: ${error.message}`;
            }
        }
    }
];

export default tools;
export { tools };
