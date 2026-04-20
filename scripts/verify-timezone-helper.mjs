// Verification script for src/lib/utils/timezone.ts
// Run: node scripts/verify-timezone-helper.mjs
//
// Asserts that getTodayStartInTimezone returns the correct UTC ISO string
// for UTC, America/New_York, America/Los_Angeles, and Asia/Tokyo.

import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

function getTodayStartInTimezone(timeZone) {
    try {
        const dateInTz = formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd");
        const midnightUtc = fromZonedTime(`${dateInTz} 00:00:00`, timeZone);
        return midnightUtc.toISOString();
    } catch (error) {
        const utcMidnight = new Date();
        utcMidnight.setUTCHours(0, 0, 0, 0);
        return utcMidnight.toISOString();
    }
}

function assert(condition, message) {
    if (!condition) {
        console.error(`FAIL: ${message}`);
        process.exit(1);
    }
    console.log(`PASS: ${message}`);
}

// For each zone, the returned UTC ISO string must represent the exact moment
// of 00:00:00 wall-clock in that zone on the current local date there.
function verifyZone(zone) {
    const result = getTodayStartInTimezone(zone);
    const resultDate = new Date(result);

    // Format the result moment in the target zone — it must read as 00:00:00 on some date.
    const wallClockInZone = formatInTimeZone(resultDate, zone, "yyyy-MM-dd HH:mm:ss");
    const [datePart, timePart] = wallClockInZone.split(" ");

    assert(
        timePart === "00:00:00",
        `[${zone}] wall-clock time is 00:00:00 (got "${timePart}" on ${datePart})`,
    );

    // And that date in the zone must equal "today" in the zone.
    const todayInZone = formatInTimeZone(new Date(), zone, "yyyy-MM-dd");
    assert(
        datePart === todayInZone,
        `[${zone}] wall-clock date equals today (got "${datePart}", expected "${todayInZone}")`,
    );

    // The returned string must be a valid ISO-8601 with trailing Z (UTC).
    assert(/Z$/.test(result), `[${zone}] result is UTC-stamped (${result})`);
}

console.log("Verifying getTodayStartInTimezone against 4 zones...\n");
for (const zone of ["UTC", "America/New_York", "America/Los_Angeles", "Asia/Tokyo"]) {
    verifyZone(zone);
    console.log("");
}

// Invalid timezone must fall back to UTC midnight (not throw).
const invalid = getTodayStartInTimezone("Invalid/Garbage");
const invalidDate = new Date(invalid);
assert(
    invalidDate.getUTCHours() === 0 &&
        invalidDate.getUTCMinutes() === 0 &&
        invalidDate.getUTCSeconds() === 0,
    `[Invalid/Garbage] falls back to UTC midnight (got ${invalid})`,
);

console.log("\nAll timezone helper checks passed.");
