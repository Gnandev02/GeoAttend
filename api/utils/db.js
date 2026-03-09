const { Pool } = require('pg');

let pool;

const getDbPool = () => {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL environment variable is missing.");
        }

        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
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
