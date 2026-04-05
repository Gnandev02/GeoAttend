const fs = require('fs');
const path = 'c:\\Users\\kamal\\GeoAttend\\api\\main.js';
let content = fs.readFileSync(path, 'utf8');

const addStudentBlock = `            if (action === "addStudent") {
                const { name, email, rollNumber, department } = req.body;

                // Requirement 6: Block addition if campus is not configured
                const campusCheck = await query('SELECT latitude, longitude FROM campus_setup WHERE college_code = $1', [admin.college_code]);
                if (campusCheck.rows.length === 0 || !campusCheck.rows[0].latitude) {
                    return res.status(400).json({ 
                        success: false, 
                        message: "Campus setup required before adding students" 
                    });
                }
                
                // Extra validation: email required
                if (!email) return res.status(400).json({ message: "Email is required" });`;

const brokenMarker = ',ReplacementChunks:';
const validationMarker = 'if (!email) return res.status(400).json({ message: "Email is required" });';

const startIdx = content.indexOf(brokenMarker);
const endIdx = content.indexOf(validationMarker);

if (startIdx !== -1 && endIdx !== -1) {
    const prefix = content.substring(0, startIdx);
    const suffix = content.substring(endIdx);
    content = prefix + addStudentBlock + '\n' + suffix;
} else {
    console.log("Could not find broken markers - verify manually.");
}

// Ensure get-campus is clean (it might have been patched partially)
const getCampusTarget = `            let row;
            if (result.rows.length === 0) {
                // Return empty structure for new/unconfigured campus
                row = {
                    name: null,
                    latitude: null,
                    longitude: null,
                    radius: null,
                    attendance_start_time: '09:00 AM',
                    attendance_end_time: '05:00 PM',
                    college_code: user.college_code === 'ORG-FFW9GH' ? null : user.college_code,
                    polygon_coordinates: null
                };
            } else {
                row = result.rows[0];
            }`;

const getCampusReplacement = `            let row;
            if (result.rows.length === 0) {
                // Return clean empty structure for new/unconfigured campus
                row = {
                    name: null,
                    latitude: null,
                    longitude: null,
                    radius: null,
                    attendance_start_time: null,
                    attendance_end_time: null,
                    college_code: user.college_code,
                    polygon_coordinates: null
                };
            } else {
                row = result.rows[0];
            }`;

if (content.includes(getCampusTarget)) {
    content = content.replace(getCampusTarget, getCampusReplacement);
}

fs.writeFileSync(path, content, 'utf8');
console.log("main.js patched.");
