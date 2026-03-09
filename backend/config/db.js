const { Pool } = require("pg");

const initDB = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await pool.query('SELECT NOW()');
    console.log("Connected to Neon PostgreSQL");

    // Create tables
    const createAdminsTable = `
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        college_name VARCHAR(255) NOT NULL,
        college_code VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createStudentsTable = `
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        roll_number VARCHAR(100) NOT NULL,
        department VARCHAR(255),
        college_code VARCHAR(255) REFERENCES admins(college_code)
      );
    `;

    const createAttendanceTable = `
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        distance_from_center INTEGER,
        status VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        college_code VARCHAR(255) REFERENCES admins(college_code),
        date DATE,
        time TIME,
        session_name VARCHAR(255)
      );
    `;

    const createGeofenceTable = `
      CREATE TABLE IF NOT EXISTS geofence (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        radius INTEGER NOT NULL,
        college_code VARCHAR(255) UNIQUE REFERENCES admins(college_code)
      );
    `;

    await pool.query(createAdminsTable);
    await pool.query(createStudentsTable);
    await pool.query(createAttendanceTable);
    await pool.query(createGeofenceTable);
    console.log("PostgreSQL tables checked/created successfully");

    return pool;
  } catch (error) {
    console.error("Neon PostgreSQL connection error:", error);
    process.exit(1);
  }
};

module.exports = initDB;

