require('dotenv').config({ path: '.env.local' });
const { query } = require('../api/utils/db');

async function migrate() {
    try {
        console.log("Starting Face Authentication migration...");

        // 1. Create student_face_profiles table
        await query(`
            CREATE TABLE IF NOT EXISTS student_face_profiles (
                id SERIAL PRIMARY KEY,
                student_id INTEGER UNIQUE NOT NULL,
                face_descriptor TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Table 'student_face_profiles' ensured.");

        // 2. Add face_auth_enabled to campus_setup
        await query(`
            ALTER TABLE campus_setup 
            ADD COLUMN IF NOT EXISTS face_auth_enabled BOOLEAN DEFAULT false
        `);
        console.log("✅ Column 'face_auth_enabled' ensured in 'campus_setup'.");

        console.log("\nMigration completed successfully.");
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
    } finally {
        process.exit();
    }
}

migrate();
