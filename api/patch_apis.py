import os

students_file = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\api\students.js"
with open(students_file, 'r', encoding='utf-8') as f:
    s_content = f.read()

# Add imports for students.js
s_content = s_content.replace(
    "const { protectAdmin, protectStudent, hashPassword } = require('./utils/auth');",
    "const { protectAdmin, protectStudent, hashPassword, comparePassword } = require('./utils/auth');\nconst { sendOnboardingEmail } = require('./utils/email');"
)

# Patch addStudent
old_add_student = """            const studentName = req.body.studentName || req.body.name;
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

            return res.status(201).json({ message: 'Student created successfully', student: newStudent.rows[0] });"""

new_add_student = """            const studentName = req.body.studentName || req.body.name;
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

            return res.status(201).json({ message: 'Student created securely. Temporary password sent via email.', student: newStudent.rows[0] });"""
s_content = s_content.replace(old_add_student, new_add_student)

# Add changePassword before getStudents
new_change_pwd = """
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
            await query('UPDATE students SET password = $1, is_first_login = FALSE WHERE id = $2', [hashedPassword, student.id]);

            return res.status(200).json({ message: 'Password updated successfully' });
        }

        if (action === 'getStudents'"""
s_content = s_content.replace("        if (action === 'getStudents'", new_change_pwd)

with open(students_file, 'w', encoding='utf-8') as f:
    f.write(s_content)


auth_file = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\api\auth.js"
with open(auth_file, 'r', encoding='utf-8') as f:
    a_content = f.read()

old_auth_login = """            if (await comparePassword(password, student.password)) {
                return res.status(200).json({
                    _id: student.id, name: student.name, email: student.email, rollNumber: student.roll_number, role: 'student', collegeCode: student.college_code, token: generateToken(student.id, student.college_code),
                });
            }"""
new_auth_login = """            if (await comparePassword(password, student.password)) {
                return res.status(200).json({
                    _id: student.id, name: student.name, email: student.email, rollNumber: student.roll_number, role: 'student', collegeCode: student.college_code, isFirstLogin: student.is_first_login, token: generateToken(student.id, student.college_code),
                });
            }"""
a_content = a_content.replace(old_auth_login, new_auth_login)

with open(auth_file, 'w', encoding='utf-8') as f:
    f.write(a_content)

print("Patching complete for api/students.js and api/auth.js")
