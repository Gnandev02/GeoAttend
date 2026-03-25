require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("--- Checking table: attendance ---");
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'attendance'");
        console.log("Columns:", res.rows.map(r => `${r.column_name} (${r.data_type})`).join(", "));

        console.log("\n--- Checking recent attendance ---");
        const att = await pool.query("SELECT * FROM attendance ORDER BY id DESC LIMIT 5");
        console.log("Data:", JSON.stringify(att.rows, null, 2));

        console.log("\n--- Checking college codes in attendance vs students ---");
        const attCodes = await pool.query("SELECT DISTINCT college_code FROM attendance");
        const stuCodes = await pool.query("SELECT DISTINCT college_code FROM students");
        console.log("Attendance Codes:", attCodes.rows.map(r => r.college_code));
        console.log("Student Codes:", stuCodes.rows.map(r => r.college_code));

    } catch (e) {
        console.error("DB Error:", e.message);
    } finally {
        await pool.end();
    }
}
run();
