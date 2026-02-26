const DEFAULT_LANG = 'en';

function sanitizeWord(input) {
    const raw = String(input == null ? '' : input).trim();
    if (!raw) return '';
    const firstToken = raw.split(/\s+/)[0];
    return firstToken.replace(/[^a-zA-Z'-]/g, '');
}

function pickIpaAndAudio(entry) {
    const phonetics = Array.isArray(entry && entry.phonetics) ? entry.phonetics : [];
    let ipa = '';
    let audio = '';

    for (const p of phonetics) {
        if (!ipa && typeof p?.text === 'string' && p.text.trim()) ipa = p.text.trim();
        if (!audio && typeof p?.audio === 'string' && p.audio.trim()) audio = p.audio.trim();
        if (ipa && audio) break;
    }
    if (!audio) {
        for (const p of phonetics) {
            if (typeof p?.audio === 'string' && p.audio.trim()) {
                audio = p.audio.trim();
                break;
            }
        }
    }

    return { ipa, audio };
}

function extractMeanings(entry, maxDefs = 3) {
    const meanings = Array.isArray(entry && entry.meanings) ? entry.meanings : [];
    const out = [];

    for (const m of meanings) {
        const pos = String(m?.partOfSpeech || '').trim();
        const defs = Array.isArray(m?.definitions) ? m.definitions : [];
        for (const d of defs) {
            const defText = String(d?.definition || '').trim();
            const example = String(d?.example || '').trim();
            if (defText) {
                out.push({ partOfSpeech: pos || null, definition: defText, example: example || null });
            }
            if (out.length >= maxDefs) return out;
        }
    }
    return out;
}

async function dictionaryLookup({ word, lang = DEFAULT_LANG, maxMeanings = 3 } = {}) {
    if (typeof fetch !== 'function') {
        return { ok: false, error: 'fetch is not available in this runtime' };
    }

    const q = sanitizeWord(word);
    if (!q) return { ok: false, error: 'Invalid word input' };

    const language = String(lang || DEFAULT_LANG).trim().toLowerCase() || DEFAULT_LANG;
    const url = `https://api.dictionaryapi.dev/api/v2/entries/${encodeURIComponent(language)}/${encodeURIComponent(q)}`;

    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));

    if (!res.ok || !Array.isArray(json) || json.length === 0) {
        return {
            ok: false,
            word: q,
            lang: language,
            status: res.status,
            url,
            error: json?.message || json?.title || 'Lookup failed',
            details: json,
        };
    }

    const entry = json[0];
    const outWord = entry?.word || q;
    const { ipa, audio } = pickIpaAndAudio(entry);
    const maxDefs = Math.max(1, Math.min(10, Number(maxMeanings) || 3));
    const meanings = extractMeanings(entry, maxDefs);

    const lines = [];
    lines.push(`${outWord}${ipa ? ' ' + ipa : ''}`);
    if (audio) lines.push(`Audio: ${audio}`);
    for (const m of meanings) {
        const pos = m.partOfSpeech ? `[${m.partOfSpeech}] ` : '';
        lines.push(`${pos}${m.definition}`);
        if (m.example) lines.push(`e.g. ${m.example}`);
    }

    return {
        ok: true,
        word: outWord,
        lang: language,
        ipa: ipa || null,
        audio: audio || null,
        meanings,
        source: 'dictionaryapi.dev',
        url,
        text: lines.join('\n'),
    };
}

export default [
    {
        name: 'dictionary_lookup',
        description: 'Look up an English word using DictionaryAPI (works in Node and Browser).',
        meta: {
            intentTemplate: 'lookup word "{word}"',
        },
        parameters: {
            type: 'object',
            properties: {
                word: { type: 'string', description: 'Word to look up (if phrase, first token is used).' },
                lang: { type: 'string', description: 'Language code (default: en).', default: DEFAULT_LANG },
                maxMeanings: { type: 'number', description: 'Max meanings/definitions to return (1-10).', default: 3 },
            },
            required: ['word'],
        },
        func: dictionaryLookup,
    },
];
