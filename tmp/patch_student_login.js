const fs = require('fs');
const filePath = 'c:\\Users\\kamal\\GeoAttend\\api\\main.js';
let content = fs.readFileSync(filePath, 'utf8');

const newLoginLogic = `if (action === "auth-login" || action === "studentLogin") {
                const collegeCode = (req.body.collegeCode || req.body.college_code || "").toString();
                
                console.log(\`[studentLogin] Attempt: Email=\${email}, Campus=\${collegeCode || 'none'}\`);

                // 1. Fetch ALL records with this email
                const result = await query('SELECT * FROM students WHERE email = $1', [email]);
                console.log(\`[studentLogin] Database matches for email: \${result.rows.length}\`);

                if (result.rows.length === 0) {
                    return res.status(401).json({ success: false, message: 'Student not found.' });
                }

                if (collegeCode) {
                    // Direct Login with Campus verification
                    const student = result.rows.find(s => s.college_code && s.college_code.toLowerCase() === collegeCode.toLowerCase());
                    
                    if (!student) {
                        return res.status(401).json({ success: false, message: 'Wrong campus selected.' });
                    }

                    if (await comparePassword(password, student.password)) {
                        const token = generateToken(student.id, student.email, student.college_code, 'student');
                        return res.status(200).json({ 
                            success: true,
                            token,
                            id: student.id, 
                            name: student.name, 
                            email: student.email, 
                            rollNumber: student.roll_number, 
                            role: 'student', 
                            collegeCode: student.college_code 
                        });
                    }
                    return res.status(401).json({ success: false, message: 'Incorrect password.' });
                }

                // Smart Login: check all campus matches for this student
                const validMatches = [];
                for (const student of result.rows) {
                    if (await comparePassword(password, student.password)) {
                        validMatches.push(student);
                    }
                }

                if (validMatches.length === 0) {
                    return res.status(401).json({ success: false, message: 'Incorrect password.' });
                }

                if (validMatches.length === 1) {
                    const student = validMatches[0];
                    const token = generateToken(student.id, student.email, student.college_code, 'student');
                    return res.status(200).json({ 
                        success: true,
                        token,
                        id: student.id, 
                        name: student.name, 
                        email: student.email, 
                        rollNumber: student.roll_number, 
                        role: 'student', 
                        collegeCode: student.college_code 
                    });
                }

                // Multiple valid password matches
                const campusIds = validMatches.map(s => s.college_code);
                const campusNamesQ = await query('SELECT college_code, name FROM campus_setup WHERE college_code = ANY($1)', [campusIds]);
                const campusMap = {};
                campusNamesQ.rows.forEach(r => campusMap[r.college_code] = r.name);

                const choices = validMatches.map(s => ({
                    collegeCode: s.college_code,
                    collegeName: campusMap[s.college_code] || 'Institution ' + s.college_code
                }));

                return res.status(200).json({ 
                    success: true, 
                    multipleCampuses: true, 
                    message: 'Multiple institutions detected. Please select yours.',
                    campuses: choices
                });
            }`;

const startMarker = 'if (action === "auth-login" || action === "studentLogin") {';
const endMarker = 'else if (action === "adminLogin") {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const prefix = content.substring(0, startIndex);
    const suffix = content.substring(endIndex);
    fs.writeFileSync(filePath, prefix + newLoginLogic + "\n            " + suffix, 'utf8');
    console.log("Successfully patched studentLogin in main.js!");
} else {
    console.log("Could not find studentLogin block markers.");
}
