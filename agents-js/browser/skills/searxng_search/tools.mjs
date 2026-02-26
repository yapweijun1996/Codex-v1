export default [
    {
        name: "searxng_query",
        description: "Search the web via private instance. Returns results and infoboxes (Wikipedia/Wikidata).",
        meta: {
            intentTemplate: 'search web for "{query}"',
        },
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "The search query" },
                category: { type: "string", description: "Optional category: general, news, it, science", default: "general" }
            },
            required: ["query"]
        },
        func: async ({ query, category = "general" }) => {
            const baseUrl = 'https://search.yapweijun1996.com/search';
            const params = new URLSearchParams({
                q: query,
                format: 'json',
                categories: category
            });

            const isBrowser = typeof window !== 'undefined';
            const url = `${baseUrl}?${params.toString()}`;
 
            try {
                const headers = isBrowser ? undefined : { 'User-Agent': 'Agent-JS/2.0' };
                const response = await fetch(url, { headers });

                if (!response.ok) {
                    return { error: `Search service responded with ${response.status}`, status: response.status };
                }

                const data = await response.json();

                // 1. Extract regular results
                const results = (data.results || []).slice(0, 8).map(r => ({
                    title: r.title,
                    url: r.url,
                    snippet: r.content || r.snippet || ""
                }));

                // 2. Extract rich infoboxes (Contains Wikipedia/Wikidata summaries)
                const infoboxes = (data.infoboxes || []).map(i => ({
                    title: i.infobox || i.id,
                    content: i.content,
                    url: (i.urls && i.urls[0]) ? i.urls[0].url : null,
                    attributes: i.attributes || []
                }));

                const meta = {
                    count: results.length,
                    infoboxCount: infoboxes.length,
                    unresponsive: (data.unresponsive_engines || []).map(e => e[0])
                };

                if (results.length === 0 && infoboxes.length === 0) {
                    return {
                        message: "No results or infoboxes found. Potentially rate-limited by upstream engines.",
                        meta
                    };
                }

                return { results, infoboxes, meta };

            } catch (error) {
                const msg = String(error && error.message ? error.message : error);
                const lower = msg.toLowerCase();
                const looksLikeCors = (
                    lower.includes('cors') ||
                    lower.includes('cross-origin') ||
                    lower.includes('access-control-allow-origin') ||
                    lower.includes('failed to fetch') ||
                    lower.includes('networkerror when attempting to fetch') ||
                    lower.includes('load failed')
                );

                if (isBrowser && looksLikeCors) {
                    return {
                        error: 'Environment Restriction (Browser CORS)',
                        platform: 'browser',
                        reason: 'CORS blocked fetch',
                        message: `Browser blocked this request (CORS / same-origin). The search service did not allow cross-origin requests. Original error: ${msg}`,
                        url,
                    };
                }

                return { error: 'Failed to connect to search service', message: msg };
            }
        }
    }
];
