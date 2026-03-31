require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const query = (text, params) => pool.query(text, params);

async function migrate() {
    try {
        console.log("Starting migration: Composite student uniqueness...");

        // 1. Drop existing email-only unique constraint
        await query('ALTER TABLE students DROP CONSTRAINT IF EXISTS students_email_key;');
        console.log("- Dropped old constraint 'students_email_key'");

        // 2. Add composite unique constraint (email, college_code)
        // This ensures the same email can be used in DIFFERENT colleges,
        // but must be unique WITHIN the same college.
        await query('ALTER TABLE students ADD CONSTRAINT students_email_college_unique UNIQUE (email, college_code);');
        console.log("- Added new composite constraint 'students_email_college_unique' (email, college_code)");

        console.log("Migration completed successfully!");
    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        await pool.end();
        process.exit();
    }
}

migrate();
