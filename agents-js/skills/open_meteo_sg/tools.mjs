const DEFAULT_LAT = 1.3521;
const DEFAULT_LON = 103.8198;

const DEFAULT_CURRENT_VARS = [
    'temperature_2m',
    'relative_humidity_2m',
    'wind_speed_10m',
    'weather_code',
];

function weatherCodeToText(code) {
    const n = Number(code);
    if (!Number.isFinite(n)) return null;

    // Minimal mapping (keep small; caller can interpret using SKILL.md table)
    if (n === 0) return 'Clear sky';
    if (n === 1) return 'Mainly clear';
    if (n === 2) return 'Partly cloudy';
    if (n === 3) return 'Overcast';
    if (n === 95) return 'Thunderstorm';
    if (n === 61) return 'Rain (slight)';
    if (n === 63) return 'Rain (moderate)';
    if (n === 65) return 'Rain (heavy)';
    return null;
}

async function fetchCurrentWeather({
    latitude = DEFAULT_LAT,
    longitude = DEFAULT_LON,
    timezone = 'auto',
    currentVariables = DEFAULT_CURRENT_VARS,
} = {}) {
    if (typeof fetch !== 'function') {
        return { ok: false, error: 'fetch is not available in this runtime' };
    }

    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return { ok: false, error: 'Invalid latitude/longitude' };
    }

    const vars = Array.isArray(currentVariables) && currentVariables.length > 0
        ? currentVariables
        : DEFAULT_CURRENT_VARS;

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('current', vars.join(','));
    url.searchParams.set('timezone', timezone || 'auto');

    const res = await fetch(url.toString());
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
        return { ok: false, status: res.status, url: url.toString(), details: json };
    }

    const current = json && json.current;
    if (!current) {
        return { ok: false, url: url.toString(), error: 'Missing current in response', details: json };
    }

    const codeText = weatherCodeToText(current.weather_code);
    const textParts = [];
    if (current.time) textParts.push(`Time: ${current.time}`);
    if (typeof current.temperature_2m === 'number') textParts.push(`Temp: ${current.temperature_2m}°C`);
    if (typeof current.relative_humidity_2m === 'number') textParts.push(`Humidity: ${current.relative_humidity_2m}%`);
    if (typeof current.wind_speed_10m === 'number') textParts.push(`Wind: ${current.wind_speed_10m} km/h`);
    if (current.weather_code != null) textParts.push(`Code: ${current.weather_code}${codeText ? ` (${codeText})` : ''}`);

    return {
        ok: true,
        location: { lat, lon },
        timezone: json.timezone || timezone || 'auto',
        current,
        current_units: json.current_units || null,
        weather_code_text: codeText,
        text: textParts.join(' | '),
        source: 'open-meteo.com',
        url: url.toString(),
    };
}

export default [
    {
        name: 'open_meteo_current',
        description: 'Get current weather from Open-Meteo using latitude/longitude (works in Node and Browser).',
        parameters: {
            type: 'object',
            properties: {
                latitude: { type: 'number', description: 'Latitude (e.g. 1.3521).', default: DEFAULT_LAT },
                longitude: { type: 'number', description: 'Longitude (e.g. 103.8198).', default: DEFAULT_LON },
                timezone: { type: 'string', description: "Timezone name or 'auto'.", default: 'auto' },
                currentVariables: {
                    type: 'array',
                    description: 'Open-Meteo current variables list. Default covers temp/humidity/wind/weather_code.',
                    items: { type: 'string' },
                    default: DEFAULT_CURRENT_VARS,
                },
            },
            required: ['latitude', 'longitude'],
        },
        func: fetchCurrentWeather,
    },
];
