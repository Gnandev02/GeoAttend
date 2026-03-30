const { query } = require("../api/utils/db");

async function checkTimes() {
    try {
        const result = await query("SELECT college_code, attendance_start_time, attendance_end_time FROM campus_setup");
        console.log("Campus Times:", JSON.stringify(result.rows, null, 2));
    } catch (err) {
        console.error("Check failed:", err.message);
    }
    process.exit();
}

checkTimes();
