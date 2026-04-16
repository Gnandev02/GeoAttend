require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("Updating students table for biometric versioning...");
        
        await pool.query(`
            ALTER TABLE students 
            ADD COLUMN IF NOT EXISTS face_registered_once BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS fingerprint_registered_once BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS face_version INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS fingerprint_version INTEGER DEFAULT 0
        `);

        // Seed face_registered_once for existing registered students
        await pool.query(`
            UPDATE students SET face_registered_once = true WHERE face_registered = true
        `);
        
        // Seed fingerprint_registered_once for existing registered students
        await pool.query(`
            UPDATE students SET fingerprint_registered_once = true WHERE fingerprint_registered = true
        `);

        console.log("Creating biometric_requests table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS biometric_requests (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES students(id),
                student_name TEXT,
                roll_number TEXT,
                biometric_type TEXT,      -- 'face' or 'fingerprint'
                action_type TEXT,         -- 'update', 'replace', 're-register', 'remove'
                status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed'
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TIMESTAMP,
                reviewed_by INTEGER REFERENCES admins(id),
                remarks TEXT,
                expires_at TIMESTAMP
            )
        `);

        console.log("Biometric approval migration completed successfully.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await pool.end();
    }
}

run();
