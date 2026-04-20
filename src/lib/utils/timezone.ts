/**
 * Returns the UTC ISO string for "today 00:00" in the given IANA timezone.
 * Falls back to UTC midnight if the timezone is invalid.
 */
export function getTodayStartInTimezone(timeZone: string): string {
    try {
        const now = new Date();
        const dateFormatter = new Intl.DateTimeFormat("en-CA", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        const datePart = dateFormatter.format(now); // "YYYY-MM-DD"
        const localMidnight = new Date(`${datePart}T00:00:00`);
        const offsetMs = getTimezoneOffsetMs(timeZone, localMidnight);
        return new Date(localMidnight.getTime() - offsetMs).toISOString();
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

function getTimezoneOffsetMs(timeZone: string, date: Date): number {
    const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
    return utcDate.getTime() - tzDate.getTime();
}
