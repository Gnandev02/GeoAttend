require('dotenv').config();
const { query } = require('./api/utils/db');

async function createTable() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS otps (
                email VARCHAR(255) PRIMARY KEY,
                otp VARCHAR(10) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("otps table created");
    } catch (err) {
        console.error(err);
    }
}
createTable();
