require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("Running migrations...");
        await pool.query('ALTER TABLE admins ALTER COLUMN college_name DROP NOT NULL');
        console.log("Dropped NOT NULL constraint on college_name");
        
        await pool.query('ALTER TABLE admins ALTER COLUMN college_code DROP NOT NULL');
        console.log("Dropped NOT NULL constraint on college_code");

        await pool.query('ALTER TABLE geofence RENAME TO campus_setup');
        console.log("Renamed geofence table to campus_setup");
        
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
