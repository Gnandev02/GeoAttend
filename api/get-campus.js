const { query } = require("../utils/db");

export default async function handler(req, res) {
  try {
    const result = await query(`
      SELECT latitude, longitude, radius
      FROM campus_setup
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No campus data found" });
    }

    const row = result.rows[0];

    res.status(200).json({
      lat: parseFloat(row.latitude),
      lng: parseFloat(row.longitude),
      radius: parseFloat(row.radius)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
