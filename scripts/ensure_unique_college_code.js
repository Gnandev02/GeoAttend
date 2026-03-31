require('dotenv').config({ path: '.env.local' });
const { query } = require('../api/utils/db.js');

async function run() {
    try {
        console.log("Checking for 'college_code' unique constraint on 'campus_setup'...");
        
        // Add the unique constraint if it doesn't already exist.
        // We use a DO block to check for existence first if PostgreSQL version supports it, 
        // or just try to add and handle potential duplication error.
        
        await query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 
                    FROM information_schema.table_constraints 
                    WHERE table_name = 'campus_setup' 
                    AND constraint_type = 'UNIQUE' 
                    AND constraint_name = 'unique_college_code'
                ) THEN
                    ALTER TABLE campus_setup ADD CONSTRAINT unique_college_code UNIQUE (college_code);
                    RAISE NOTICE 'Constraint unique_college_code added.';
                ELSE
                    RAISE NOTICE 'Constraint unique_college_code already exists.';
                END IF;
            END $$;
        `);

        console.log("Database updated successfully.");
    } catch (e) {
        console.error("Migration failed:", e.message);
        process.exit(1);
    }
}

run();
