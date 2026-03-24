const { query } = require('../utils/db');
const { protectAdmin, protectStudent, hashPassword, comparePassword } = require('../utils/auth');
const { sendOnboardingEmail } = require('../utils/email');
const bcrypt = require('bcryptjs'); // Still kept for any direct needs if any, but hashing will use utility

export default async function handler(req, res) {
    // Explicit CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    )

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action } = req.query;

    try {
        if (action === 'addStudent' && req.method === 'POST') {
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ message: 'Not authorized as an admin' });
            if (!admin.college_code) return res.status(400).json({ message: 'Please complete campus setup first' });

            const studentName = req.body.studentName || req.body.name;
            const { rollNumber, email, department } = req.body;
            if (!studentName || !email || !rollNumber) return res.status(400).json({ message: 'Please provide all required fields (name, email, roll_number)' });

            const studentExists = await query('SELECT * FROM students WHERE email = $1', [email]);
            if (studentExists.rows.length > 0) return res.status(400).json({ message: 'Student email already exists' });

            const rollExists = await query('SELECT * FROM students WHERE roll_number = $1 AND college_code = $2', [rollNumber, admin.college_code]);
            if (rollExists.rows.length > 0) return res.status(400).json({ message: 'Roll number already exists in this college' });

            const tempPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await hashPassword(tempPassword);

            const newStudent = await query(
                'INSERT INTO students (name, email, password, roll_number, department, college_code) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [studentName, email, hashedPassword, rollNumber, department || 'General', admin.college_code]
            );

            try {
                const loginUrl = `${req.headers.origin || 'https://geoattend.vercel.app'}/student-login.html`;
                await sendOnboardingEmail(email, studentName, tempPassword, loginUrl);
            } catch (emailErr) {
                console.error("Email sending failed for new student:", emailErr);
            }

            return res.status(201).json({ message: 'Student created securely. Temporary password sent via email.', student: newStudent.rows[0] });
        }


        if (action === 'changePassword' && req.method === 'POST') {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ message: 'Not authorized' });

            const { oldPassword, newPassword } = req.body;
            if (!oldPassword || !newPassword) return res.status(400).json({ message: 'Please provide both current and new passwords' });

            const studentRow = await query('SELECT password FROM students WHERE id = $1', [student.id]);
            if (studentRow.rows.length === 0) return res.status(404).json({ message: 'User not found' });
            
            if (!(await comparePassword(oldPassword, studentRow.rows[0].password))) {
                return res.status(400).json({ message: 'Incorrect current password' });
            }

            const hashedPassword = await hashPassword(newPassword);
            await query('UPDATE students SET password = $1 WHERE id = $2', [hashedPassword, student.id]);

            return res.status(200).json({ message: 'Password updated successfully' });
        }

        if (action === 'updateStudent' && req.method === 'PUT') {
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ message: 'Not authorized as an admin' });

            const { id, name, email, rollNumber, department } = req.body;
            if (!id || !name || !email || !rollNumber) return res.status(400).json({ message: 'Missing required fields' });

            // Ensure email isn't taken by another student
            const emailCheck = await query('SELECT id FROM students WHERE email = $1 AND id != $2', [email, id]);
            if (emailCheck.rows.length > 0) return res.status(400).json({ message: 'Email already in use' });

            // Ensure roll isn't taken in this college
            const rollCheck = await query('SELECT id FROM students WHERE roll_number = $1 AND college_code = $2 AND id != $3', [rollNumber, admin.college_code, id]);
            if (rollCheck.rows.length > 0) return res.status(400).json({ message: 'Roll number already exists in this college' });

            const updateQuery = await query(
                'UPDATE students SET name = $1, email = $2, roll_number = $3, department = $4 WHERE id = $5 AND college_code = $6 RETURNING *',
                [name, email, rollNumber, department || 'General', id, admin.college_code]
            );

            if (updateQuery.rows.length === 0) return res.status(404).json({ message: 'Student not found or unauthorized' });
            return res.status(200).json({ message: 'Student updated successfully', student: updateQuery.rows[0] });
        }

        if (action === 'getStudents' && req.method === 'GET') {
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ message: 'Not authorized as an admin' });
            if (!admin.college_code) return res.status(200).json([]);

            const studentsQuery = await query('SELECT id, name, email, roll_number, department, college_code FROM students WHERE college_code = $1', [admin.college_code]);
            const mappedStudents = studentsQuery.rows.map(s => ({
                _id: s.id, name: s.name, email: s.email, rollNumber: s.roll_number, department: s.department, collegeCode: s.college_code, userId: { name: s.name, email: s.email }
            }));

            return res.status(200).json(mappedStudents);
        }

        if (action === 'deleteStudent' && req.method === 'DELETE') {
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ message: 'Not authorized as an admin' });

            const { id } = req.body;
            if (!id) return res.status(400).json({ message: 'Please provide student ID' });

            // Ensure the admin can only delete students from their own college
            const deleteResult = await query('DELETE FROM students WHERE id = $1 AND college_code = $2 RETURNING *', [id, admin.college_code]);
            if (deleteResult.rows.length === 0) {
                 return res.status(404).json({ message: 'Student not found or not in your college' });
            }

            // Optional: Also delete their attendance logs to avoid dangling relations
            await query('DELETE FROM attendance WHERE student_id = $1', [id]);

            return res.status(200).json({ message: 'Student deleted successfully' });
        }

        if (action === 'studentProfile' && req.method === 'GET') {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ message: 'Not authorized' });

            const studentQuery = await query('SELECT id, name, email, roll_number, department, college_code FROM students WHERE id = $1', [student.id]);
            if (studentQuery.rows.length === 0) return res.status(404).json({ message: 'Student profile not found' });

            const studentProfile = studentQuery.rows[0];
            return res.status(200).json({
                _id: studentProfile.id, name: studentProfile.name, email: studentProfile.email, rollNumber: studentProfile.roll_number, department: studentProfile.department, collegeCode: studentProfile.college_code
            });
        }

        return res.status(404).json({ message: 'API Action Not Found' });

    } catch (error) {
        console.error("Student API Error:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
}
