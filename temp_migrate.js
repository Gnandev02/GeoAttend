const { query } = require("./api/utils/db");

async function migrate() {
    try {
        console.log("Starting migration...");

        // 1. Add device_id column
        // We use COALESCE to avoid issues if column already exists in some environments
        await query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='device_id') THEN
                    ALTER TABLE attendance ADD COLUMN device_id TEXT;
                END IF;
            END $$;
        `);
        console.log("- Column device_id added (or already exists).");

        // 2. Check for existing duplicates that would break the unique index
        const dups = await query(`
            SELECT student_id, attendance_date, COUNT(*) 
            FROM attendance 
            GROUP BY student_id, attendance_date 
            HAVING COUNT(*) > 1
        `);
        if (dups.rows.length > 0) {
            console.warn("WARNING: Found existing duplicate attendance records for students! Unique index on (student_id, attendance_date) might fail.");
            console.warn(JSON.stringify(dups.rows));
        }

        // 3. Create unique index on (student_id, attendance_date)
        try {
            await query(`
                CREATE UNIQUE INDEX IF NOT EXISTS unique_student_day 
                ON attendance (student_id, attendance_date);
            `);
            console.log("- Index unique_student_day created.");
        } catch (e) {
            console.error("Failed to create unique_student_day:", e.message);
        }

        // 4. Create unique index on (device_id, attendance_date)
        try {
            await query(`
                CREATE UNIQUE INDEX IF NOT EXISTS unique_device_day 
                ON attendance (device_id, attendance_date) 
                WHERE device_id IS NOT NULL;
            `);
            console.log("- Index unique_device_day created.");
        } catch (e) {
            console.error("Failed to create unique_device_day:", e.message);
        }

        console.log("Migration finished (with potential errors logged).");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
