require('dotenv').config();
const { query } = require('../api/utils/db');

async function ensureSchema() {
    try {
        console.log("Checking otps table schema...");
        await query(`
            ALTER TABLE otps 
            ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0
        `);
        console.log("Schema check complete (attempts column ensured).");
    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log("Column 'attempts' already exists.");
        } else {
            console.error("Schema update error:", err.message);
        }
    }
}

ensureSchema();
