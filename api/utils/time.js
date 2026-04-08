function getIST() {
    const now = new Date();
    const IST = { timeZone: 'Asia/Kolkata' };
    const date = now.toLocaleDateString('en-CA', IST); // YYYY-MM-DD
    const time = now.toLocaleTimeString('en-US', { ...IST, hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return { date, time, raw: now };
}

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

module.exports = { getIST, timeStringToMinutes };
