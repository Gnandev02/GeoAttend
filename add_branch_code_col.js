const { query } = require('./api/utils/db');

async function migrate() {
    try {
        console.log("Starting Migration: Adding branch_code column...");
        
        // 1. Add branch_code column if not exists
        await query(`
            ALTER TABLE campus_setup 
            ADD COLUMN IF NOT EXISTS branch_code TEXT;
        `);
        console.log("Column branch_code checked/added.");

        // 2. Initialize branch_code with college_code where it's null
        const result = await query(`
            UPDATE campus_setup 
            SET branch_code = college_code 
            WHERE branch_code IS NULL;
        `);
        console.log(`Initialized ${result.rowCount} records with default branch_code.`);

        process.exit(0);
    } catch (err) {
        console.error("Migration Failed:", err);
        process.exit(1);
    }
}

migrate();
