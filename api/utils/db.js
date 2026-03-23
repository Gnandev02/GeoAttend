const { Pool } = require('pg');

let pool;

const getDbPool = () => {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL environment variable is missing.");
        }

        const dbUrl = process.env.DATABASE_URL;
        const urlParts = new URL(dbUrl);
        console.log(`[DB] Initializing Pool for host: ${urlParts.hostname}, database: ${urlParts.pathname.substring(1)}`);

        pool = new Pool({
            connectionString: dbUrl,
            ssl: {
                rejectUnauthorized: false
            }
        });
    }
    return pool;
};

const query = async (text, params) => {
    const db = getDbPool();
    return await db.query(text, params);
};

module.exports = { getDbPool, query };
