const { Pool } = require("pg");

let pool;

if (!global.pool) {
  global.pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_oIY1DNxfVGk8@ep-falling-frog-a11339mt-pooler.ap-southeast-1.aws.neon.tech/GeoAttend?sslmode=require",
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

pool = global.pool;

module.exports = {
  query: async (text, params) => {
    try {
      const res = await pool.query(text, params);
      return res;
    } catch (err) {
      console.error("DB ERROR:", err.message);
      throw err;
    }
  },
};
