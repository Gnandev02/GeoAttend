require('dotenv').config({path: '.env.local'});
const { query } = require('./api/utils/db');

async function migrateAdmins() {
    try {
        const result = await query("SELECT id, name, email FROM admins WHERE college_code IS NULL OR college_code = ''");
        const admins = result.rows;
        
        console.log(`Found ${admins.length} admins without college_code.`);

        for (const admin of admins) {
            const generatedCollegeCode = 'ORG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            
            console.log(`Updating admin ${admin.email} with code ${generatedCollegeCode}...`);
            
            await query("UPDATE admins SET college_code = $1 WHERE id = $2", [generatedCollegeCode, admin.id]);
            
            // Also create campus_setup if it doesn't exist
            await query(
                "INSERT INTO campus_setup (college_code, name, latitude, longitude, radius) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
                [generatedCollegeCode, 'Main Campus', 23.2599, 77.4126, 200]
            );
        }
        
        console.log('Migration complete.');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

migrateAdmins();
