import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Returns the UTC ISO string for "today 00:00" in the given IANA timezone.
 * Falls back to UTC midnight if the timezone is invalid.
 */
export function getTodayStartInTimezone(timeZone: string): string {
    try {
        const dateInTz = formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd");
        const midnightUtc = fromZonedTime(`${dateInTz} 00:00:00`, timeZone);
        return midnightUtc.toISOString();
    } catch (error) {
        console.warn(
            `[timezone] Invalid timezone "${timeZone}", falling back to UTC midnight`,
            error,
        );
        const utcMidnight = new Date();
        utcMidnight.setUTCHours(0, 0, 0, 0);
        return utcMidnight.toISOString();
    }
}
