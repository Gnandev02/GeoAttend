require('dotenv').config();
const { query } = require('./api/utils/db');

async function main() {
    try {
        await query('ALTER TABLE attendance ADD COLUMN location_accuracy NUMERIC;');
        console.log('Added location_accuracy to attendance');
    } catch (e) {
        if (e.message.includes('already exists')) {
            console.log('Column already exists');
        } else {
            console.error(e);
        }
    }
    process.exit(0);
}
main();
