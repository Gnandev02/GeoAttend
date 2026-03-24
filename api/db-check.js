const { query } = require('../utils/db');

export default async function handler(req, res) {
    console.log("Running DB Schema Diagnostic...");
    
    try {
        const dbUrl = process.env.DATABASE_URL;
        const urlParts = new URL(dbUrl);
        const diagInfo = {
            active_host: urlParts.hostname,
            active_database: urlParts.pathname.substring(1),
            tables: [],
            campus_setup_columns: []
        };

        // 1. List Tables
        const tablesQueryResult = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        `);
        diagInfo.tables = tablesQueryResult.rows.map(r => r.table_name);

        // 2. Check campus_setup columns
        if (diagInfo.tables.includes('campus_setup')) {
            const columnsQueryResult = await query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'campus_setup';
            `);
            diagInfo.campus_setup_columns = columnsQueryResult.rows;
        }

        return res.status(200).json({ 
            success: true, 
            diagnostics: diagInfo 
        });

    } catch (error) {
        console.error("Diagnostic Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Diagnostic failed: " + error.message 
        });
    }
}
