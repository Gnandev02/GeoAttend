const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_oIY1DNxfVGk8@ep-falling-frog-a11339mt-pooler.ap-southeast-1.aws.neon.tech/GeoAttend?sslmode=require&channel_binding=require",
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
