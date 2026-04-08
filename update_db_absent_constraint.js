require("dotenv").config({ path: "./frontend/.env.local" });
const { query } = require("./api/utils/db");

async function updateSchema() {
    try {
        console.log("Checking and adding unique constraint to attendance table...");
        
        // Check if constraint already exists
        const check = await query(`
            SELECT count(*) 
            FROM pg_constraint 
            WHERE conrelid = 'attendance'::regclass 
            AND conname = 'unique_student_date'
        `);

        if (parseInt(check.rows[0].count) === 0) {
            console.log("Creating unique_student_date constraint...");
            // Use attendance_date for the constraint
            await query(`
                ALTER TABLE attendance 
                ADD CONSTRAINT unique_student_date UNIQUE (student_id, attendance_date)
            `);
            console.log("Constraint created successfully.");
        } else {
            console.log("Constraint 'unique_student_date' already exists.");
        }
    } catch (err) {
        console.error("Schema update failed:", err);
        if (err.code === '23505') {
            console.warn("WARNING: Duplicate records found in attendance table. Please clean data before applying unique constraint.");
        }
    }
    process.exit();
}

updateSchema();
