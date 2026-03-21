const { query } = require('./utils/db');

export default async function handler(req, res) {
    // Explicit CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    )

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log("Starting migration...");
        
        // 1. Drop NOT NULL constraints
        await query('ALTER TABLE admins ALTER COLUMN college_name DROP NOT NULL');
        console.log("Dropped NOT NULL on college_name");
        
        await query('ALTER TABLE admins ALTER COLUMN college_code DROP NOT NULL');
        console.log("Dropped NOT NULL on college_code");

        // 2. Update students table
        await query('ALTER TABLE students DROP COLUMN IF EXISTS is_first_login');
        console.log("Dropped is_first_login from students table");

        // 3. Update attendance table for Check-In / Check-Out
        try {
            // First, add new columns if they don't exist
            await query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS attendance_date DATE');
            await query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in_time TIME');
            await query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out_time TIME');
            await query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS distance_at_checkin INTEGER');
            
            // Populate attendance_date from existing date column if needed
            await query('UPDATE attendance SET attendance_date = CAST(date AS DATE) WHERE attendance_date IS NULL AND date IS NOT NULL');

            // Add unique constraint (student_id, attendance_date)
            // Note: We try-catch this in case it exists
            try {
                await query('ALTER TABLE attendance ADD CONSTRAINT unique_student_daily_attendance UNIQUE (student_id, attendance_date)');
                console.log("Added unique constraint on student_id and attendance_date");
            } catch (constraintErr) {
                console.log("Unique constraint might already exist or failed. Skipping...");
            }
            
                console.log("Updated attendance table schema");
            } catch (attendErr) {
                console.error("Attendance table migration error:", attendErr);
            }

            // 4. Add Indexes for Multi-Tenant performance
            console.log("Adding performance indexes for multi-tenant isolation...");
            await query('CREATE INDEX IF NOT EXISTS idx_admins_college_code ON admins(college_code)');
            await query('CREATE INDEX IF NOT EXISTS idx_students_college_code ON students(college_code)');
            await query('CREATE INDEX IF NOT EXISTS idx_attendance_college_code ON attendance(college_code)');
            await query('CREATE INDEX IF NOT EXISTS idx_campus_setup_college_code ON campus_setup(college_code)');

            return res.status(200).json({ 
                message: "Migration Successful! Multi-tenant performance indexes added.",
                steps: [
                    "Dropped NOT NULL on admins.college_name",
                    "Dropped NOT NULL on admins.college_code",
                    "Added attendance columns: attendance_date, check_in_time, check_out_time, distance_at_checkin",
                    "Attempted to add unique constraint for daily attendance",
                    "Created performance indexes for college_code on all tables"
                ]
            });

    } catch (error) {
        console.error("Migration Error:", error);
        return res.status(500).json({ 
            message: "Migration Failed", 
            error: error.message 
        });
    }
}
