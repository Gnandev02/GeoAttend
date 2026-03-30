const { query } = require('./utils/db');

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

export default async function handler(req, res) {
    console.log("[CRON] /api/mark-absent triggered at", new Date().toISOString());

    // 1. Authenticate via CRON_SECRET matching Vercel's standard
    // Vercel Cron automatically sends a Bearer token in the Authorization header.
    // E.g., Authorization: Bearer <CRON_SECRET>
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const authHeader = req.headers.authorization || '';
        if (authHeader !== `Bearer ${cronSecret}`) {
            console.error("[CRON] Unauthorized access attempt detected.");
            return res.status(401).json({ success: false, message: 'Unauthorized execution attempt.' });
        }
    } else {
        console.warn("[CRON] CRON_SECRET is not set in environment variables! Executing without authentication.");
    }

    try {
        const { date: todayIST, time: currentTime } = getIST();
        const currMins = timeStringToMinutes(currentTime);

        console.log(`[CRON] Processing day: ${todayIST}, Time: ${currentTime} (${currMins} mins)`);

        let markedCount = 0;
        let processedStudents = 0;
        let skippedTimeConstraint = 0;

        // 2. Fetch all campuses and determine time constraints
        const campusQ = await query('SELECT college_code, attendance_end_time FROM campus_setup');
        const campuses = {};
        for (const campus of campusQ.rows) {
            campuses[campus.college_code] = timeStringToMinutes(campus.attendance_end_time) || 0;
        }

        // 3. Fetch all students
        const studentsQ = await query('SELECT id, college_code FROM students');
        const students = studentsQ.rows;

        // 4. Iterate and apply absence
        for (const student of students) {
            processedStudents++;
            const endMins = campuses[student.college_code] || 0;

            // Only enforce absence if the attendance_end_time has naturally passed
            // If the time hasn't passed, do not mark them absent yet.
            if (endMins > 0 && currMins < endMins) {
                skippedTimeConstraint++;
                continue;
            }

            const checkQ = await query(
                'SELECT id FROM attendance WHERE student_id = $1 AND attendance_date = $2',
                [student.id, todayIST]
            );

            if (checkQ.rows.length === 0) {
                await query(
                    `INSERT INTO attendance (student_id, college_code, attendance_date, status) 
                     VALUES ($1, $2, $3, $4)`,
                    [student.id, student.college_code, todayIST, 'Absent']
                );
                markedCount++;
            }
        }

        console.log(`[CRON] Execution final breakdown:`);
        console.log(`  -> Total Students Analyzed: ${processedStudents}`);
        console.log(`  -> Skipped (Time Window Active): ${skippedTimeConstraint}`);
        console.log(`  -> Inserted "Absent" Records: ${markedCount}`);

        return res.status(200).json({ 
            success: true, 
            metrics: {
                processedStudents,
                skippedTimeConstraint,
                markedAbsentCount: markedCount
            },
            message: `Cron executed successfully. Marked ${markedCount} students as Absent for ${todayIST}.` 
        });

    } catch (err) {
        console.error("[CRON] Execution Error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
