const { query } = require("./api/utils/db");

async function checkFinal() {
    try {
        const a = await query("SELECT id, name, email, college_code FROM admins WHERE email = 'geoattend01@gmail.com'");
        console.log("Actual Admin:", a.rows);
        
        if (a.rows.length > 0) {
            const code = a.rows[0].college_code;
            const students = await query("SELECT count(*) FROM students WHERE college_code = $1", [code]);
            console.log(`Students for code ${code}:`, students.rows[0].count);
            
            const logs = await query("SELECT count(*) FROM attendance WHERE college_code = $1", [code]);
            console.log(`Attendance logs for code ${code}:`, logs.rows[0].count);
        }
    } catch (err) {
        console.error("Check failed:", err.message);
    }
    process.exit();
}

checkFinal();
