const { query } = require('./utils/db');
const { protectAdmin, protectStudent, hashPassword } = require('./utils/auth');
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
            const { rollNumber, email, password, department } = req.body;
            if (!studentName || !email || !password || !rollNumber) return res.status(400).json({ message: 'Please provide all required fields' });

            const studentExists = await query('SELECT * FROM students WHERE email = $1', [email]);
            if (studentExists.rows.length > 0) return res.status(400).json({ message: 'Student email already exists' });

            const rollExists = await query('SELECT * FROM students WHERE roll_number = $1 AND college_code = $2', [rollNumber, admin.college_code]);
            if (rollExists.rows.length > 0) return res.status(400).json({ message: 'Roll number already exists in this college' });

            const hashedPassword = await hashPassword(password);

            const newStudent = await query(
                'INSERT INTO students (name, email, password, roll_number, department, college_code) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [studentName, email, hashedPassword, rollNumber, department || 'General', admin.college_code]
            );

            return res.status(201).json({ message: 'Student created successfully', student: newStudent.rows[0] });
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
