/**
 * OneMap Postcode → Address (API only)
 * Usage: node scripts/onemap_postcode.js "339407"
 *
 * Env:
 *  - ONEMAP_EMAIL
 *  - ONEMAP_PASSWORD
 *
 * Token cache:
 *  - ../.token_cache.json
 */

const fs = require("fs");
const path = require("path");

const POSTCODE = String(process.argv[2] || "").trim();
if (!/^\d{6}$/.test(POSTCODE)) {
    console.error("Please provide a 6-digit Singapore postal code. Example: 339407");
    process.exit(1);
}

const EMAIL = process.env.ONEMAP_EMAIL;
const PASSWORD = process.env.ONEMAP_PASSWORD;
if (!EMAIL || !PASSWORD) {
    console.error("Missing env: ONEMAP_EMAIL / ONEMAP_PASSWORD");
    process.exit(1);
}

const SKILL_ROOT = path.resolve(__dirname, "..");
const TOKEN_CACHE_FILE = path.join(SKILL_ROOT, ".token_cache.json");

function nowSec() {
    return Math.floor(Date.now() / 1000);
}

function base64UrlDecode(str) {
    const pad = "=".repeat((4 - (str.length % 4)) % 4);
    const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(b64, "base64").toString("utf8");
}

function parseJwtExp(token) {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    try {
        const payload = JSON.parse(base64UrlDecode(parts[1]));
        return typeof payload.exp === "number" ? payload.exp : null;
    } catch {
        return null;
    }
}

function readTokenCache() {
    try {
        const raw = fs.readFileSync(TOKEN_CACHE_FILE, "utf8");
        const json = JSON.parse(raw);
        if (json && typeof json.token === "string" && typeof json.exp === "number") return json;
    } catch { }
    return null;
}

function writeTokenCache(token, exp) {
    try {
        fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify({ token, exp }, null, 2), "utf8");
    } catch { }
}

async function getTokenFresh() {
    const res = await fetch("https://www.onemap.gov.sg/api/auth/post/getToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`getToken failed: HTTP ${res.status} ${txt}`);
    }

    const json = await res.json();
    const token = json.access_token || json.accessToken || json.token;
    if (!token) throw new Error("getToken: access_token not found in response.");

    const exp = parseJwtExp(token) || (nowSec() + 30 * 60);
    writeTokenCache(token, exp);
    return token;
}

async function getToken() {
    const cache = readTokenCache();
    if (cache && cache.exp - 60 > nowSec()) return cache.token; // refresh 60s early
    return await getTokenFresh();
}

async function searchPostcode(token) {
    const url =
        "https://www.onemap.gov.sg/api/common/elastic/search" +
        `?searchVal=${encodeURIComponent(POSTCODE)}` +
        "&returnGeom=Y&getAddrDetails=Y&pageNum=1";

    const res = await fetch(url, {
        headers: { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` },
    });

    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
}

function pickBest(results) {
    if (!Array.isArray(results) || results.length === 0) return null;
    const exact = results.find(r => String(r.POSTAL || "").trim() === POSTCODE);
    return exact || results[0];
}

function topPlaceNames(results, limit = 3) {
    if (!Array.isArray(results)) return [];
    const out = [];
    for (const r of results) {
        const addr = String(r.ADDRESS || "");
        const name = addr.split("  ")[0].trim();
        if (name && !out.includes(name)) out.push(name);
        if (out.length >= limit) break;
    }
    return out;
}

(async () => {
    let token = await getToken();
    let r = await searchPostcode(token);

    // Retry once on auth failure
    if (!r.ok && (r.status === 401 || r.status === 403)) {
        token = await getTokenFresh();
        r = await searchPostcode(token);
    }

    if (!r.ok) {
        console.log(JSON.stringify({ ok: false, postcode: POSTCODE, status: r.status, details: r.json }, null, 2));
        return;
    }

    const best = pickBest(r.json.results);
    if (!best) {
        console.log(JSON.stringify({ ok: true, found: false, postcode: POSTCODE }, null, 2));
        return;
    }

    console.log(
        JSON.stringify(
            {
                ok: true,
                found: true,
                postcode: best.POSTAL || POSTCODE,
                address: best.ADDRESS,
                lat: best.LATITUDE,
                lon: best.LONGITUDE,
                top_places: topPlaceNames(r.json.results, 3),
            },
            null,
            2
        )
    );
})().catch(e => {
    console.error(String(e && e.message ? e.message : e));
    process.exit(1);
});
