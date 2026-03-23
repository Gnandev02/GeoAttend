const { query } = require('./utils/db');

export default async function handler(req, res) {
    console.log("Starting Attendance Timing Schema Fix...");
    
    try {
        // 1. Check if table exists
        const tableCheck = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'campus_setup'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            return res.status(404).json({ 
                success: false, 
                message: "Table 'campus_setup' not found. Please ensure initial migrations are complete." 
            });
        }

        // 2. Add attendance_start_time column
        console.log("Adding attendance_start_time column...");
        await query(`
            ALTER TABLE campus_setup 
            ADD COLUMN IF NOT EXISTS attendance_start_time TIME;
        `);

        // 3. Add attendance_end_time column
        console.log("Adding attendance_end_time column...");
        await query(`
            ALTER TABLE campus_setup 
            ADD COLUMN IF NOT EXISTS attendance_end_time TIME;
        `);

        console.log("Schema Fix Successful!");
        return res.status(200).json({ 
            success: true, 
            message: "Database schema updated successfully. Attendance timing columns (TIME) added to 'campus_setup'." 
        });

    } catch (error) {
        console.error("Schema Fix Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Database migration failed: " + error.message 
        });
    }
}
