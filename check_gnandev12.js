require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("--- Listing ALL Students ---");
        const stu = await pool.query("SELECT id, name, email, college_code FROM students");
        console.log(JSON.stringify(stu.rows, null, 2));

        console.log("\n--- Listing ALL Campuses ---");
        const res = await pool.query("SELECT * FROM campus_setup");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
