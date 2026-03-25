const { query } = require('./api/utils/db');

async function check() {
    try {
        const res = await query('SELECT * FROM students');
        console.log("--- STUDENTS ---");
        res.rows.forEach(r => console.log(JSON.stringify(r)));
        
        const res2 = await query('SELECT * FROM campus_setup');
        console.log("--- CAMPUS SETUP ---");
        res2.rows.forEach(r => console.log(JSON.stringify(r)));
    } catch (e) {
        console.error(e);
    }
}
check();
