const DEFAULT_LOCALE = 'en-US';

function safeTz(tz) {
    if (tz == null) return null;
    const s = String(tz).trim();
    return s ? s : null;
}

function buildOutput(now, { timeZone, locale }) {
    const options = {
        timeZone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    };

    const readableTime = now.toLocaleString(locale, options);

    const tzNameFmt = new Intl.DateTimeFormat(locale, {
        timeZone,
        timeZoneName: 'longOffset',
    });

    const parts = tzNameFmt.formatToParts(now);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    const utcOffset = offsetPart ? offsetPart.value.replace('GMT', 'UTC') : 'Unknown';

    const dayFormatter = new Intl.DateTimeFormat(locale, {
        timeZone,
        weekday: 'long',
    });
    const dayOfWeek = dayFormatter.format(now);

    const outTz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';

    return {
        ok: true,
        timezone: outTz,
        current_time: readableTime,
        utc_offset: utcOffset,
        day_of_week: dayOfWeek,
        iso: now.toISOString(),
        text: `Timezone: ${outTz} | Current Time: ${readableTime} | UTC Offset: ${utcOffset} | Day: ${dayOfWeek}`,
        source: 'Intl.DateTimeFormat',
    };
}

async function worldtimeNow({ timezone, locale = DEFAULT_LOCALE } = {}) {
    const tz = safeTz(timezone);
    const now = new Date();

    // Validate timezone if provided.
    if (tz) {
        try {
            // Throws RangeError on invalid timeZone
            new Intl.DateTimeFormat(locale, { timeZone: tz }).format(now);
        } catch {
            return {
                ok: false,
                error: `Invalid timezone: ${tz}`,
                examples: [
                    'Asia/Singapore',
                    'Asia/Tokyo',
                    'America/New_York',
                    'Europe/London',
                ],
            };
        }
    }

    return buildOutput(now, { timeZone: tz || undefined, locale });
}

export default [
    {
        name: 'worldtime_now',
        description: 'Get current time for a timezone (no external API; works in Node and Browser).',
        meta: {
            intentTemplate: 'get time for {timezone}',
        },
        parameters: {
            type: 'object',
            properties: {
                timezone: { type: 'string', description: 'IANA timezone (e.g. Asia/Tokyo). Omit for local time.' },
                locale: { type: 'string', description: 'Locale for formatting.', default: DEFAULT_LOCALE },
            },
            required: [],
        },
        func: worldtimeNow,
    },
];
