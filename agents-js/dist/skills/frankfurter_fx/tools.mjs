const DEFAULT_FROM = 'USD';
const DEFAULT_TO = 'SGD';

function normalizeCcy(x, fallback) {
    const s = String(x == null ? '' : x).trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(s)) return s;
    return fallback;
}

async function fetchLatestFx({ from = DEFAULT_FROM, to = DEFAULT_TO } = {}) {
    if (typeof fetch !== 'function') {
        return { ok: false, error: 'fetch is not available in this runtime' };
    }

    const FROM = normalizeCcy(from, DEFAULT_FROM);
    const TO = normalizeCcy(to, DEFAULT_TO);

    const url = new URL('https://api.frankfurter.app/latest');
    url.searchParams.set('from', FROM);
    url.searchParams.set('to', TO);

    const res = await fetch(url.toString());
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
        return { ok: false, from: FROM, to: TO, status: res.status, url: url.toString(), details: json };
    }

    const rate = json && json.rates ? json.rates[TO] : undefined;
    if (typeof rate !== 'number') {
        return {
            ok: false,
            from: FROM,
            to: TO,
            date: json && json.date,
            url: url.toString(),
            error: 'Rate not found in response',
            details: json,
        };
    }

    return {
        ok: true,
        date: json.date,
        from: FROM,
        to: TO,
        rate,
        text: `1 ${FROM} = ${rate} ${TO} (date: ${json.date})`,
        source: 'frankfurter.app',
        url: url.toString(),
    };
}

export default [
    {
        name: 'frankfurter_fx_latest',
        description: 'Get latest FX rate using Frankfurter API (works in Node and Browser).',
        parameters: {
            type: 'object',
            properties: {
                from: { type: 'string', description: 'Base currency (e.g. USD).', default: DEFAULT_FROM },
                to: { type: 'string', description: 'Target currency (e.g. SGD).', default: DEFAULT_TO },
            },
            required: ['from', 'to'],
        },
        func: fetchLatestFx,
    },
];
