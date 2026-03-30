const { query } = require('../api/utils/db');

async function migrate() {
    try {
        await query('ALTER TABLE campus_setup ADD COLUMN IF NOT EXISTS polygon_coordinates JSONB');
        console.log('Migration successful: polygon_coordinates added.');
    } catch (err) {
        console.error('Migration failed:', err);
    }
    process.exit();
}

migrate();
