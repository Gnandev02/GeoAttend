const { query } = require("./db");
const { getIST, timeStringToMinutes } = require("./time");

async function markAbsentStudents() {
    const { date: todayIST, time: currentTime } = getIST();
    const currMins = timeStringToMinutes(currentTime);
    
    console.log(`[Absent-Marker] Running at ${todayIST} ${currentTime}`);

    try {
        // 1. Fetch all campuses that have an attendance_end_time configured
        const campuses = await query(`
            SELECT college_code, attendance_end_time, attendance_start_date, attendance_end_date
            FROM campus_setup 
            WHERE attendance_end_time IS NOT NULL AND attendance_end_time != ''
        `);

        for (const campus of campuses.rows) {
            const endMins = timeStringToMinutes(campus.attendance_end_time);
            
            // Check Date Range (Requirement 6)
            if (campus.attendance_start_date && campus.attendance_end_date) {
                const today = new Date(todayIST);
                const start = new Date(campus.attendance_start_date);
                const end = new Date(campus.attendance_end_date);
                if (today < start || today > end) {
                    console.log(`[Absent-Marker] Skipping Campus ${campus.college_code}: Outside Attendance Period.`);
                    continue;
                }
            }

            // Check if global current time is past this campus's end time
            // Or if we are running at very late night (e.g., after 9 PM) we mark for all
            if (currMins > endMins || currMins < 300) { 
                console.log(`[Absent-Marker] Processing Campus: ${campus.college_code} (End Time: ${campus.attendance_end_time})`);
                
                // Target date: yesterday if running before 5 AM, otherwise today
                const targetDate = (currMins < 300) ? 
                    new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0] : 
                    todayIST;

                const result = await query(`
                    INSERT INTO attendance (student_id, college_code, attendance_date, status, source)
                    SELECT s.id, s.college_code, $1, 'Absent', 'system'
                    FROM students s
                    WHERE s.college_code = $2
                    AND NOT EXISTS (
                        SELECT 1 FROM attendance a 
                        WHERE a.student_id = s.id 
                        AND a.attendance_date = $1
                    )
                `, [targetDate, campus.college_code]);

                if (result.rowCount > 0) {
                    console.log(`[Absent-Marker] Marked ${result.rowCount} students as Absent for ${campus.college_code} on ${targetDate}`);
                }
            }
        }
        return { success: true, processed: campuses.rows.length };
    } catch (err) {
        console.error("[Absent-Marker] Error:", err);
        return { success: false, error: err.message };
    }
}

module.exports = { markAbsentStudents };
