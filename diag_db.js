require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("--- Schema: attendance ---");
        const schema = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'attendance'");
        console.log(JSON.stringify(schema.rows, null, 2));

        console.log("\n--- Sample Log Records ---");
        const logs = await pool.query("SELECT * FROM attendance LIMIT 5");
        console.log(JSON.stringify(logs.rows, null, 2));

        console.log("\n--- Student Counts by College Code ---");
        const counts = await pool.query("SELECT college_code, COUNT(*) FROM students GROUP BY college_code");
        console.log(JSON.stringify(counts.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
