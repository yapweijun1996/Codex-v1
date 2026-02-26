function sanitizePostcode(input) {
    const s = String(input == null ? '' : input).trim();
    const digits = s.replace(/\D/g, '');
    return digits;
}

function pickBest(results, postcode) {
    if (!Array.isArray(results) || results.length === 0) return null;
    const exact = results.find(r => String(r?.POSTAL || '').trim() === postcode);
    return exact || results[0];
}

function toNum(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
}

async function onemapPostcodeLookup({ postcode } = {}) {
    if (typeof fetch !== 'function') {
        return { ok: false, error: 'fetch is not available in this runtime' };
    }

    const pc = sanitizePostcode(postcode);
    if (!/^\d{6}$/.test(pc)) {
        return { ok: false, error: 'Invalid postcode (expected 6 digits)', postcode: pc || null };
    }

    const url = new URL('https://www.onemap.gov.sg/api/common/elastic/search');
    url.searchParams.set('searchVal', pc);
    url.searchParams.set('returnGeom', 'Y');
    url.searchParams.set('getAddrDetails', 'Y');
    url.searchParams.set('pageNum', '1');

    const res = await fetch(url.toString());
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
        return { ok: false, postcode: pc, status: res.status, url: url.toString(), details: json };
    }

    const found = Number(json?.found || 0);
    const best = pickBest(json?.results, pc);
    if (!best || found <= 0) {
        return { ok: true, found: false, postcode: pc, url: url.toString() };
    }

    const address = String(best?.ADDRESS || '').trim() || null;
    const latRaw = best?.LATITUDE;
    const lonRaw = best?.LONGITUDE;
    const lat = toNum(latRaw);
    const lon = toNum(lonRaw);

    const text = [
        `Postcode: ${pc}`,
        address ? `Address: ${address}` : null,
        (lat != null && lon != null) ? `Coordinates: ${lat}, ${lon}` : null,
    ].filter(Boolean).join(' | ');

    return {
        ok: true,
        found: true,
        postcode: String(best?.POSTAL || pc).trim() || pc,
        address,
        latitude: lat != null ? lat : latRaw,
        longitude: lon != null ? lon : lonRaw,
        source: 'onemap.gov.sg',
        url: url.toString(),
        text,
        raw: best,
    };
}

export default [
    {
        name: 'onemap_postcode_lookup',
        description: 'Resolve a Singapore 6-digit postcode to address and coordinates using OneMap (works in Node and Browser).',
        meta: {
            intentTemplate: 'lookup postcode {postcode}',
        },
        parameters: {
            type: 'object',
            properties: {
                postcode: { type: 'string', description: 'Singapore postcode (6 digits), e.g. 339511.' },
            },
            required: ['postcode'],
        },
        func: onemapPostcodeLookup,
    },
];
