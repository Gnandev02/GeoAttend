require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("Adding biometric columns to students table...");
        
        await pool.query(`
            ALTER TABLE students 
            ADD COLUMN IF NOT EXISTS auth_method TEXT DEFAULT 'face',
            ADD COLUMN IF NOT EXISTS face_registered BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS fingerprint_registered BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS webauthn_credential_id TEXT,
            ADD COLUMN IF NOT EXISTS webauthn_public_key TEXT,
            ADD COLUMN IF NOT EXISTS webauthn_challenge TEXT
        `);
        
        console.log("Refreshing face_registered status from existing profiles...");
        await pool.query(`
            UPDATE students 
            SET face_registered = true 
            WHERE id IN (SELECT student_id FROM student_face_profiles)
        `);

        console.log("Migration completed successfully.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await pool.end();
    }
}

run();
