const { query } = require('../api/utils/db');

async function testCron() {
    console.log("Starting cron test...");
    const now = new Date();
    const IST = { timeZone: 'Asia/Kolkata' };
    const date = now.toLocaleDateString('en-CA', IST);
    
    // 1. Get all students
    const studentsQ = await query('SELECT id, college_code FROM students LIMIT 5');
    const students = studentsQ.rows;
    console.log(`Found ${students.length} students to check for ${date}.`);

    let markedCount = 0;
    
    // 2. Loop through and check attendance for today
    for (const student of students) {
        const checkQ = await query(
            'SELECT id FROM attendance WHERE student_id = $1 AND attendance_date = $2',
            [student.id, date]
        );

        if (checkQ.rows.length === 0) {
            console.log(`Student ${student.id} has no record. Marking Absent.`);
            // Only simulate instead of actually inserting right now
            // or insert and rollback? Let's just log what it would do.
            markedCount++;
        } else {
            console.log(`Student ${student.id} already has a record.`);
        }
    }
    
    console.log(`Test completed. Would mark ${markedCount} students as Absent.`);
    process.exit(0);
}

testCron().catch(console.error);
