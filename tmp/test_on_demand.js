// Isolated DB test logic

// We just mock the auth to return a valid fake student 
// but since `protectStudent` relies on actual DB, we'll just mock the req.
// Actually, `test_on_demand` will run the handler. It might fail auth if no valid token in DB.
// Let's just create a raw DB script to test `enforceAbsences` logic specifically!
// I'll extract `enforceAbsences` logic to test it.

const { query } = require('../api/utils/db');

function getIST() {
    const now = new Date();
    const IST = { timeZone: 'Asia/Kolkata' };
    const date = now.toLocaleDateString('en-CA', IST);
    const time = "11:59:00 PM"; // MOCK TIME LATE AT NIGHT FOR TESTING
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

async function testEnforceAbsences(collegeCode, studentId = null) {
    try {
        console.log(`[TEST] Enforcing for ${collegeCode}, Student: ${studentId || 'ALL'}`);
        const { date: todayIST, time: currentTime } = getIST();
        const currMins = timeStringToMinutes(currentTime);

        const campusQ = await query('SELECT attendance_end_time FROM campus_setup WHERE college_code = $1', [collegeCode]);
        if (campusQ.rows.length === 0) return console.log("No campus.");
        const endMins = timeStringToMinutes(campusQ.rows[0].attendance_end_time);

        console.log(`[TEST] Current: ${currMins} mins | End: ${endMins} mins`);

        if (endMins > 0 && currMins > endMins) {
            if (studentId) {
                console.log("[TEST] Running SINGLE SQL query");
                const res = await query(`
                    INSERT INTO attendance (student_id, college_code, attendance_date, status)
                    SELECT $1, $2, $3, 'Absent'
                    WHERE NOT EXISTS (
                        SELECT 1 FROM attendance WHERE student_id = $1 AND attendance_date = $3
                    )
                    RETURNING id
                `, [studentId, collegeCode, todayIST]);
                console.log(`Inserted Rows: ${res.rowCount}`);
            } else {
                console.log("[TEST] Running BULK SQL query");
                const res = await query(`
                    INSERT INTO attendance (student_id, college_code, attendance_date, status)
                    SELECT id, college_code, $1, 'Absent'
                    FROM students
                    WHERE college_code = $2
                      AND NOT EXISTS (
                        SELECT 1 FROM attendance a WHERE a.student_id = students.id AND a.attendance_date = $1
                      )
                    RETURNING id
                `, [todayIST, collegeCode]);
                console.log(`Inserted Rows: ${res.rowCount}`);
            }
        } else {
            console.log("[TEST] Time constraint skips insertion.");
        }
    } catch (err) {
        console.error("[TEST] Error:", err);
    }
}

async function runTest() {
    // We fetch an existing student to test
    const s = await query('SELECT id, college_code FROM students LIMIT 1');
    if(s.rows.length > 0) {
        await testEnforceAbsences(s.rows[0].college_code, s.rows[0].id); // Single
        await testEnforceAbsences(s.rows[0].college_code); // Bulk
    } else {
        console.log("No students found.");
    }
    process.exit(0);
}

runTest();
