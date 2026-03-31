require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const query = (text, params) => pool.query(text, params);

async function checkConstraints() {
    try {
        const res = await query(`
            SELECT conname, contype, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'students'::regclass;
        `);
        fs.writeFileSync('constraints_output.json', JSON.stringify(res.rows, null, 2));
        console.log("Output written to constraints_output.json");
    } catch (err) {
        console.error("Error checking constraints:", err);
    } finally {
        await pool.end();
        process.exit();
    }
}

checkConstraints();
