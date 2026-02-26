/**
 * DictionaryAPI (dictionaryapi.dev) lookup
 * Usage: node scripts/dictionary_lookup.js hello
 *
 * Output: JSON (stable for agent parsing) + short text summary in "text"
 */

const WORD = String(process.argv[2] || "").trim();

function fail(msg) {
    console.error(msg);
    process.exit(1);
}

if (!WORD) fail("Please provide a word. Example: node scripts/dictionary_lookup.js hello");

// Basic sanitize: keep letters, hyphen, apostrophe (avoid weird URL)
const q = WORD.replace(/[^a-zA-Z'-]/g, "");
if (!q) fail("Invalid word input.");

const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`;

function pickIpaAndAudio(entry) {
    const phonetics = Array.isArray(entry?.phonetics) ? entry.phonetics : [];
    let ipa = "";
    let audio = "";

    // Prefer an item with text (IPA)
    for (const p of phonetics) {
        if (!ipa && typeof p?.text === "string" && p.text.trim()) ipa = p.text.trim();
        if (!audio && typeof p?.audio === "string" && p.audio.trim()) audio = p.audio.trim();
        if (ipa && audio) break;
    }
    // If still no audio, try again for any audio
    if (!audio) {
        for (const p of phonetics) {
            if (typeof p?.audio === "string" && p.audio.trim()) {
                audio = p.audio.trim();
                break;
            }
        }
    }
    return { ipa, audio };
}

function extractMeanings(entry, maxDefs = 3) {
    const meanings = Array.isArray(entry?.meanings) ? entry.meanings : [];
    const out = [];

    for (const m of meanings) {
        const pos = String(m?.partOfSpeech || "").trim();
        const defs = Array.isArray(m?.definitions) ? m.definitions : [];
        for (const d of defs) {
            const defText = String(d?.definition || "").trim();
            const example = String(d?.example || "").trim();
            if (defText) {
                out.push({ partOfSpeech: pos || null, definition: defText, example: example || null });
            }
            if (out.length >= maxDefs) return out;
        }
    }
    return out;
}

(async () => {
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));

    // DictionaryAPI returns an error JSON with title/message/resolution sometimes
    if (!res.ok || !Array.isArray(json) || json.length === 0) {
        console.log(
            JSON.stringify(
                {
                    ok: false,
                    word: q,
                    status: res.status,
                    url,
                    error: json?.message || json?.title || "Lookup failed",
                    details: json,
                },
                null,
                2
            )
        );
        return;
    }

    const entry = json[0];
    const word = entry?.word || q;

    const { ipa, audio } = pickIpaAndAudio(entry);
    const meanings = extractMeanings(entry, 3);

    const lines = [];
    lines.push(`${word}${ipa ? " " + ipa : ""}`);
    if (audio) lines.push(`Audio: ${audio}`);
    for (const m of meanings) {
        const pos = m.partOfSpeech ? `[${m.partOfSpeech}] ` : "";
        lines.push(`${pos}${m.definition}`);
        if (m.example) lines.push(`e.g. ${m.example}`);
    }

    console.log(
        JSON.stringify(
            {
                ok: true,
                word,
                ipa: ipa || null,
                audio: audio || null,
                meanings,
                source: "dictionaryapi.dev",
                url,
                text: lines.join("\n"),
            },
            null,
            2
        )
    );
})().catch((e) => {
    fail(String(e?.message || e));
});
