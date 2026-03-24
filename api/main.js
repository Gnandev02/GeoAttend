const adminHandler = require("./handlers/admin");
const attendanceTodayHandler = require("./handlers/attendance-today");
const attendanceHandler = require("./handlers/attendance");
const authHandler = require("./handlers/auth");
const dbCheckHandler = require("./handlers/db-check");
const getCampusHandler = require("./handlers/get-campus");
const migrateHandler = require("./handlers/migrate");
const setupTimingHandler = require("./handlers/setup-timing");
const studentsHandler = require("./handlers/students");

export default async function handler(req, res) {
  const { action } = req.query;

  try {
    switch (action) {
      // Auth Actions
      case "auth":
      case "adminLogin":
      case "adminSignup":
      case "studentLogin":
      case "forgotPassword":
      case "resetPassword":
      case "verifyResetOTP":
      case "sendAdminOtp":
        return await authHandler(req, res);

      // Attendance Actions
      case "attendance":
      case "mark-attendance":
      case "markAttendance":
      case "manualMark":
      case "getAttendanceLogs":
      case "track":
        return await attendanceHandler(req, res);

      // Other Specialized Actions
      case "get-campus":
      case "getCampus":
        return await getCampusHandler(req, res);
      
      case "attendance-today":
        return await attendanceTodayHandler(req, res);

      case "admin":
        return await adminHandler(req, res);
      
      case "students":
        return await studentsHandler(req, res);

      case "db-check":
        return await dbCheckHandler(req, res);

      case "migrate":
        return await migrateHandler(req, res);

      case "setup-timing":
        return await setupTimingHandler(req, res);

      case "test-db":
        const { query } = require("../utils/db");
        const result = await query("SELECT NOW()");
        return res.status(200).json({ success: true, time: result.rows[0] });

      default:
        // Attempt to find a handler by action if not explicitly mapped
        if (!action) return res.status(400).json({ error: "Missing action parameter" });
        return res.status(400).json({ error: "Invalid action: " + action });
    }
  } catch (err) {
    console.error(`Error in action ${action}:`, err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
