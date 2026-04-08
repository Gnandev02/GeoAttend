require("dotenv").config({ path: "./frontend/.env.local" });
const { query } = require("./api/utils/db");

async function updateSchema() {
    try {
        console.log("Adding attendance date columns to campus_setup table...");
        await query(`
            ALTER TABLE campus_setup 
            ADD COLUMN IF NOT EXISTS attendance_start_date DATE,
            ADD COLUMN IF NOT EXISTS attendance_end_date DATE
        `);
        console.log("Database updated successfully.");
    } catch (err) {
        console.error("Database update failed:", err);
    }
    process.exit();
}

updateSchema();
