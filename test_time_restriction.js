function timeStringToMinutes(timeStr) {
    if (!timeStr) return 0;
    const str = String(timeStr).trim();
    const match = str.match(/(\d+):(\d+):?(\d+)?\s*(AM|PM|am|pm)?/);
    if (!match) return 0;
    let [ , h, m, , ampm ] = match;
    h = parseInt(h);
    m = parseInt(m);
    if (ampm) {
        if (ampm.toLowerCase() === 'pm' && h < 12) h += 12;
        if (ampm.toLowerCase() === 'am' && h === 12) h = 0;
    }
    return h * 60 + m;
}

function testLogic(currentTime, startTime, endTime) {
    const currMins = timeStringToMinutes(currentTime);
    const startMins = timeStringToMinutes(startTime);
    const endMins = timeStringToMinutes(endTime);

    let isTrackingHours = false;
    if (startMins <= endMins) {
        isTrackingHours = currMins >= startMins && currMins <= endMins;
    } else {
        isTrackingHours = currMins >= startMins || currMins <= endMins;
    }
    return isTrackingHours;
}

const tests = [
    { current: "09:00 AM", start: "08:00 AM", end: "04:00 PM", expected: true },
    { current: "07:00 AM", start: "08:00 AM", end: "04:00 PM", expected: false },
    { current: "05:00 PM", start: "08:00 AM", end: "04:00 PM", expected: false },
    { current: "11:00 PM", start: "10:00 PM", end: "06:00 AM", expected: true },
    { current: "02:00 AM", start: "10:00 PM", end: "06:00 AM", expected: true },
    { current: "08:00 AM", start: "10:00 PM", end: "06:00 AM", expected: false },
    { current: "14:00:00", start: "13:00", end: "15:00", expected: true }, // 24-hr format
    { current: "16:00:00", start: "13:00", end: "15:00", expected: false }, // 24-hr format
];

let allPassed = true;
for (const t of tests) {
    const result = testLogic(t.current, t.start, t.end);
    if (result !== t.expected) {
        console.error(`FAILED: current=${t.current}, start=${t.start}, end=${t.end}. Expected ${t.expected}, got ${result}`);
        allPassed = false;
    } else {
        console.log(`PASSED: current=${t.current}, start=${t.start}, end=${t.end}. Got ${result}`);
    }
}

if (allPassed) {
    console.log("All time logic tests passed.");
} else {
    console.error("Some time logic tests failed.");
    process.exit(1);
}
