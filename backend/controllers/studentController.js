// @desc    Get student profile
// @route   GET /api/student/profile
// @access  Private (student only)
const getStudentProfile = async (req, res) => {
    try {
        const studentQuery = await req.app.locals.pool.query('SELECT id, name, email, roll_number, department, college_code FROM students WHERE id = $1', [req.student.id]);

        if (studentQuery.rows.length === 0) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        const s = studentQuery.rows[0];

        // Format to support frontend expectations: studentData.userId.name
        const studentData = {
            _id: s.id,
            name: s.name,
            email: s.email,
            rollNumber: s.roll_number,
            department: s.department,
            collegeCode: s.college_code,
            userId: { name: s.name, email: s.email } // provide backwards compatibility
        };

        res.json(studentData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getStudentProfile
};
