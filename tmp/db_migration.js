const { query } = require('../api/utils/db');
async function migrate() {
  try {
    console.log("Starting migration...");
    
    // 1. Rename column if it exists with the typo
    try {
      await query("ALTER TABLE campus_setup RENAME COLUMN attendence_start_time TO attendance_start_time");
      console.log("Renamed attendence_start_time to attendance_start_time");
    } catch (e) {
      console.log("Column attendence_start_time not found or already renamed. Skipping rename.");
    }

    // 2. Change types to VARCHAR
    await query("ALTER TABLE campus_setup ALTER COLUMN attendance_start_time TYPE VARCHAR(20)");
    await query("ALTER TABLE campus_setup ALTER COLUMN attendance_end_time TYPE VARCHAR(20)");
    console.log("Changed column types to VARCHAR(20)");

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (e) {
    console.error("Migration failed:", e);
    process.exit(1);
  }
}
migrate();
