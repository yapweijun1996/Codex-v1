/**
 * Open-Meteo Current Weather
 * Usage:
 *   node scripts/open_meteo_current.js
 *   node scripts/open_meteo_current.js 1.3521 103.8198
 *
 * Output: JSON (stable for agent parsing)
 */

const DEFAULT_LAT = 1.3521;
const DEFAULT_LON = 103.8198;

function toNum(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
}

const latArg = process.argv[2];
const lonArg = process.argv[3];

const LAT = toNum(latArg) ?? DEFAULT_LAT;
const LON = toNum(lonArg) ?? DEFAULT_LON;

const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${encodeURIComponent(LAT)}` +
    `&longitude=${encodeURIComponent(LON)}` +
    "&current_weather=true";

function fail(msg) {
    console.error(msg);
    process.exit(1);
}

(async () => {
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
        console.log(
            JSON.stringify(
                { ok: false, status: res.status, url, details: json },
                null,
                2
            )
        );
        return;
    }

    const cw = json?.current_weather;
    if (!cw) {
        console.log(
            JSON.stringify(
                { ok: false, url, error: "Missing current_weather in response", details: json },
                null,
                2
            )
        );
        return;
    }

    // Open-Meteo fields (common): temperature, windspeed, winddirection, weathercode, time
    const out = {
        ok: true,
        location: { lat: LAT, lon: LON },
        time: cw.time,
        temperature_c: cw.temperature,
        windspeed_kmh: cw.windspeed,
        winddirection_deg: cw.winddirection,
        weathercode: cw.weathercode,
        text:
            `Time: ${cw.time} | ` +
            `Temp: ${cw.temperature}°C | ` +
            `Wind: ${cw.windspeed} km/h @ ${cw.winddirection}° | ` +
            `Code: ${cw.weathercode}`,
        source: "open-meteo.com",
        url
    };

    console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
    fail(String(e?.message || e));
});
