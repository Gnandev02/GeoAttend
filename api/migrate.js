const { query } = require('./utils/db');

export default async function handler(req, res) {
    // Explicit CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    )

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log("Starting migration...");
        
        // 1. Drop NOT NULL constraints
        await query('ALTER TABLE admins ALTER COLUMN college_name DROP NOT NULL');
        console.log("Dropped NOT NULL on college_name");
        
        await query('ALTER TABLE admins ALTER COLUMN college_code DROP NOT NULL');
        console.log("Dropped NOT NULL on college_code");

        // 2. Rename geofence table if it exists
        try {
            await query('ALTER TABLE geofence RENAME TO campus_setup');
            console.log("Renamed geofence table to campus_setup");
        } catch (renameErr) {
            console.log("Geofence table might already be renamed or doesn't exist. Skipping...");
        }

        return res.status(200).json({ 
            message: "Migration Successful! You can now sign up without college details.",
            steps: [
                "Dropped NOT NULL on admins.college_name",
                "Dropped NOT NULL on admins.college_code",
                "Attempted rename of geofence to campus_setup"
            ]
        });

    } catch (error) {
        console.error("Migration Error:", error);
        return res.status(500).json({ 
            message: "Migration Failed", 
            error: error.message 
        });
    }
}
