const { query } = require('./api/utils/db');

async function check() {
    try {
        const res = await query("SELECT * FROM campus_setup LIMIT 1");
        console.log("Sample Row:", JSON.stringify(res.rows[0], null, 2));
    } catch (e) {
        console.error("Query Error:", e.message);
    }
}
check();
