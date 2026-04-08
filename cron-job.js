const cron = require("node-cron");
const { markAbsentStudents } = require("./api/utils/absent-marker");
require("dotenv").config({ path: "./frontend/.env.local" });

console.log("[GeoAttend-Cron] Scheduler started...");

// Run every hour at minute 0
cron.schedule("0 * * * *", async () => {
    console.log("[GeoAttend-Cron] Triggering daily absent marking...");
    const result = await markAbsentStudents();
    if (result.success) {
        console.log(`[GeoAttend-Cron] Successfully processed ${result.processed} campuses.`);
    } else {
        console.error(`[GeoAttend-Cron] Error: ${result.error}`);
    }
});

// Optional: Run immediately on start for testing
// markAbsentStudents();
