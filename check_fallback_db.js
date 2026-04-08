const { Pool } = require('pg');
const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_oIY1DNxfVGk8@ep-falling-frog-a11339mt-pooler.ap-southeast-1.aws.neon.tech/GeoAttend?sslmode=require",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const studentEmail = 'geoattend01@gmail.com';
        console.log("--- Checking FALLBACK DB for student:", studentEmail);
        const stu = await pool.query("SELECT id, name, email, college_code FROM students WHERE email = $1", [studentEmail]);
        if (stu.rows.length === 0) {
            console.log("Student not found in Fallback DB either.");
        } else {
            console.log("Student Found:", stu.rows[0]);
            const college_code = stu.rows[0].college_code;
            const res = await pool.query("SELECT * FROM campus_setup WHERE college_code = $1", [college_code]);
            console.log("Campus Setup:", JSON.stringify(res.rows, null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
