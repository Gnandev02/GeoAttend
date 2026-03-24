const { query } = require("../utils/db");

export default async function handler(req, res) {
  try {
    const result = await query("SELECT NOW()");
    res.status(200).json({
      success: true,
      time: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
