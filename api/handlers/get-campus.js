const { query } = require("../utils/db");
const { protectStudent } = require("./utils/auth");

export default async function handler(req, res) {
  try {
    const student = await protectStudent(req);

    if (!student) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await query(
      `SELECT latitude, longitude, radius 
       FROM campus_setup 
       WHERE college_code = $1`,
      [student.college_code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No campus data found for your college." });
    }

    const row = result.rows[0];

    res.status(200).json({
      lat: Number(row.latitude),
      lng: Number(row.longitude),
      radius: Number(row.radius)
    });

  } catch (err) {
    console.error("Get Campus Error:", err);
    res.status(500).json({ error: err.message });
  }
}
