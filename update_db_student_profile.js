require("dotenv").config({ path: "./frontend/.env.local" });
const { query } = require("./api/utils/db");

async function updateSchema() {
    try {
        console.log("Adding 'profile_image' column to students table...");
        await query(`
            ALTER TABLE students 
            ADD COLUMN IF NOT EXISTS profile_image TEXT
        `);
        console.log("Schema update completed successfully.");
    } catch (err) {
        console.error("Schema update failed:", err);
    }
    process.exit();
}

updateSchema();
