require("dotenv").config({ path: "./frontend/.env.local" });
const { query } = require("./api/utils/db");

async function updateSchema() {
    try {
        console.log("Adding 'plan' column to admins table...");
        await query(`
            ALTER TABLE admins 
            ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free',
            ADD COLUMN IF NOT EXISTS plan_expiry TIMESTAMP
        `);
        
        console.log("Creating payments table...");
        await query(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES admins(id),
                order_id VARCHAR(100),
                payment_id VARCHAR(100),
                signature VARCHAR(255),
                amount INTEGER,
                currency VARCHAR(10) DEFAULT 'INR',
                plan VARCHAR(50),
                status VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log("Schema update completed successfully.");
    } catch (err) {
        console.error("Schema update failed:", err);
    }
    process.exit();
}

updateSchema();
