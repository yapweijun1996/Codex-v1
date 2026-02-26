/**
 * Get Time for Any Timezone
 * Usage:
 *   node scripts/worldtime.js                    # Local time
 *   node scripts/worldtime.js Asia/Tokyo         # Tokyo time
 *   node scripts/worldtime.js America/New_York   # New York time
 *   node scripts/worldtime.js Europe/London      # London time
 *
 * Output: Plain text with current time in specified timezone
 */

// Get timezone from argument or use local
const requestedTz = process.argv[2];
const now = new Date();

// If no timezone specified, use local
if (!requestedTz) {
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
    const offsetMinutes = now.getTimezoneOffset();
    const offsetHours = Math.abs(offsetMinutes / 60);
    const offsetSign = offsetMinutes <= 0 ? '+' : '-';
    const utcOffset = `UTC${offsetSign}${String(Math.floor(offsetHours)).padStart(2, '0')}:${String(Math.abs(offsetMinutes % 60)).padStart(2, '0')}`;

    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    const readableTime = now.toLocaleString('en-US', options);
    const dayOfWeek = now.getDay();

    console.log(`Timezone: ${localTz}`);
    console.log(`Current Time: ${readableTime}`);
    console.log(`UTC Offset: ${utcOffset}`);
    console.log(`Day of Week: ${dayOfWeek} (0=Sunday, 1=Monday, ..., 6=Saturday)`);
    console.log(`ISO Format: ${now.toISOString()}`);
    process.exit(0);
}

// For specified timezone
try {
    const options = {
        timeZone: requestedTz,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    const readableTime = now.toLocaleString('en-US', options);

    // Get UTC offset for the timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: requestedTz,
        timeZoneName: 'longOffset'
    });

    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    const utcOffset = offsetPart ? offsetPart.value.replace('GMT', 'UTC') : 'Unknown';

    // Get day of week in that timezone
    const dayFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: requestedTz,
        weekday: 'long'
    });
    const dayOfWeek = dayFormatter.format(now);

    console.log(`Timezone: ${requestedTz}`);
    console.log(`Current Time: ${readableTime}`);
    console.log(`UTC Offset: ${utcOffset}`);
    console.log(`Day of Week: ${dayOfWeek}`);
    console.log(`ISO Format: ${now.toISOString()}`);

} catch (error) {
    console.error(`Error: Invalid timezone "${requestedTz}"`);
    console.error('');
    console.error('Common timezones:');
    console.error('  Asia/Singapore, Asia/Tokyo, Asia/Shanghai');
    console.error('  America/New_York, America/Los_Angeles, America/Chicago');
    console.error('  Europe/London, Europe/Paris, Europe/Berlin');
    console.error('  Australia/Sydney, Australia/Melbourne');
    process.exit(1);
}
