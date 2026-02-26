/**
 * Frankfurter FX Latest
 * Usage:
 *   node scripts/frankfurter_fx.js USD SGD
 *
 * Output: JSON (stable for agent parsing)
 */

const FROM = String(process.argv[2] || "USD").trim().toUpperCase();
const TO = String(process.argv[3] || "SGD").trim().toUpperCase();

function fail(msg) {
    console.error(msg);
    process.exit(1);
}

function isCcy(x) {
    return /^[A-Z]{3}$/.test(x);
}

if (!isCcy(FROM) || !isCcy(TO)) {
    fail('Invalid currency code. Example: node scripts/frankfurter_fx.js USD SGD');
}

const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(FROM)}&to=${encodeURIComponent(TO)}`;

(async () => {
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
        console.log(
            JSON.stringify(
                { ok: false, from: FROM, to: TO, status: res.status, url, details: json },
                null,
                2
            )
        );
        return;
    }

    const rate = json?.rates?.[TO];
    if (typeof rate !== "number") {
        console.log(
            JSON.stringify(
                { ok: false, from: FROM, to: TO, date: json?.date, url, error: "Rate not found in response", details: json },
                null,
                2
            )
        );
        return;
    }

    console.log(
        JSON.stringify(
            {
                ok: true,
                date: json.date,
                from: FROM,
                to: TO,
                rate,
                text: `1 ${FROM} = ${rate} ${TO} (date: ${json.date})`,
                source: "frankfurter.app",
                url
            },
            null,
            2
        )
    );
})().catch((e) => {
    fail(String(e?.message || e));
});
