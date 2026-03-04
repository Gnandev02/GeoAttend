const User = require('../models/User');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Campus = require('../models/Campus');
const bcrypt = require('bcryptjs');

// @desc    Add a new student
// @route   POST /api/admin/student
// @access  Private (admin only)
const addStudent = async (req, res) => {
    try {
        const { name, email, password, rollNumber, department, campusId } = req.body;

        if (!name || !email || !password || !rollNumber || !department || !campusId) {
            return res.status(400).json({ message: 'Please provide all required fields including campusId' });
        }

        // Check if campus exists
        const campus = await Campus.findById(campusId);
        if (!campus) {
            return res.status(404).json({ message: 'Campus not found' });
        }

        // Check if user/student exists
        const userExists = await User.findOne({ email });
        const studentExists = await Student.findOne({ rollNumber });

        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        if (studentExists) {
            return res.status(400).json({ message: 'Student with this roll number already exists' });
        }

        // Create user account
        const user = await User.create({
            name,
            email,
            password,
            role: 'student',
            campusId // Link to campus in User model as well
        });

        // Create student profile
        const student = await Student.create({
            userId: user._id,
            rollNumber,
            department,
            campusId
        });

        res.status(201).json({
            message: 'Student created successfully',
            student: {
                id: student._id,
                userId: user._id,
                name: user.name,
                email: user.email,
                rollNumber: student.rollNumber,
                department: student.department,
                campus: campus.name
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all students
// @route   GET /api/admin/students
// @access  Private (admin only)
const getStudents = async (req, res) => {
    try {
        const students = await Student.find().populate('userId', 'name email createdAt');
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a student
// @route   PUT /api/admin/student/:id
// @access  Private (admin only)
const updateStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const { name, email, rollNumber, department, password } = req.body;

        // Update User details
        const user = await User.findById(student.userId);
        if (user) {
            if (name) user.name = name;
            if (email) user.email = email;
            if (password) {
                user.password = password; // Will be hashed by pre-save middleware
            }
            await user.save();
        }

        // Update Student details
        if (rollNumber) student.rollNumber = rollNumber;
        if (department) student.department = department;
        await student.save();

        res.json({ message: 'Student updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a student
// @route   DELETE /api/admin/student/:id
// @access  Private (admin only)
const deleteStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Delete associated User
        await User.findByIdAndDelete(student.userId);

        // Delete associated Attendance records
        await Attendance.deleteMany({ studentId: student.userId });

        // Delete Student profile
        await student.deleteOne();

        res.json({ message: 'Student and associated data removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all attendance records
// @route   GET /api/admin/attendance
// @access  Private (admin only)
const getAllAttendance = async (req, res) => {
    try {
        const dateQuery = req.query.date; // Optional filter by date

        let query = {};
        if (dateQuery) {
            query.date = dateQuery;
        }

        const attendance = await Attendance.find(query)
            .populate('studentId', 'name email role')
            .sort({ createdAt: -1 });

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Manually mark attendance
// @route   POST /api/admin/manual
// @access  Private (admin only)
const manualMarkAttendance = async (req, res) => {
    try {
        const { studentId, date, time, status, sessionName } = req.body;

        if (!studentId || !date || !time || !sessionName) {
            return res.status(400).json({ message: 'Please provide studentId, date, time, and sessionName' });
        }

        const attendance = await Attendance.create({
            studentId,
            date,
            time,
            locationCoordinates: { lat: 0, lng: 0 }, // Admin manual override doesn't need GPS
            status: status || 'Manual',
            distance: 0,
            sessionName
        });

        res.status(201).json({ message: 'Attendance marked manually', attendance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Campus Geofence
// @route   POST /api/admin/campus
// @access  Private (admin only)
const createCampus = async (req, res) => {
    try {
        const { name, latitude, longitude, radius } = req.body;

        if (!name || !latitude || !longitude || !radius) {
            return res.status(400).json({ message: 'Please provide all campus details' });
        }

        const campus = await Campus.create({
            name,
            latitude,
            longitude,
            radius
        });

        res.status(201).json({ message: 'Campus created successfully', campus });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Update Campus Geofence
// @route   PUT /api/admin/campus/:id
// @access  Private (admin only)
const updateCampus = async (req, res) => {
    try {
        const { name, latitude, longitude, radius } = req.body;
        const campus = await Campus.findById(req.params.id);

        if (!campus) {
            return res.status(404).json({ message: 'Campus not found' });
        }

        if (name) campus.name = name;
        if (latitude) campus.latitude = latitude;
        if (longitude) campus.longitude = longitude;
        if (radius) campus.radius = radius;

        await campus.save();
        res.json({ message: 'Campus updated successfully', campus });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Delete Campus
// @route   DELETE /api/admin/campus/:id
// @access  Private (admin only)
const deleteCampus = async (req, res) => {
    try {
        const campus = await Campus.findById(req.params.id);
        if (!campus) {
            return res.status(404).json({ message: 'Campus not found' });
        }

        // check if students are linked to this campus
        const studentCount = await Student.countDocuments({ campusId: req.params.id });
        if (studentCount > 0) {
            return res.status(400).json({ message: `Cannot delete campus. ${studentCount} students are currently linked to it.` });
        }

        await campus.deleteOne();
        res.json({ message: 'Campus removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Get all Campuses
// @route   GET /api/admin/campuses
// @access  Private (admin only)
const getCampuses = async (req, res) => {
    try {
        const campuses = await Campus.find().sort({ createdAt: -1 });
        res.json(campuses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Get singular campus for frontend compatibility
// @route   GET /api/admin/campus
// @access  Private (admin only)
const getCampus = async (req, res) => {
    try {
        const campus = await Campus.findOne();
        res.json(campus || {});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Get Attendance Analytics
// @route   GET /api/admin/analytics
// @access  Private (admin only)
const getAnalytics = async (req, res) => {
    try {
        const totalStudents = await Student.countDocuments();
        const totalCampuses = await Campus.countDocuments();

        // aggregate attendance by status
        const stats = await Attendance.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const formattedStats = {
            Present: 0,
            Rejected: 0,
            Manual: 0
        };

        stats.forEach(stat => {
            if (formattedStats.hasOwnProperty(stat._id)) {
                formattedStats[stat._id] = stat.count;
            }
        });

        // Attendance percentage per student
        const studentStats = await Attendance.aggregate([
            {
                $group: {
                    _id: "$studentId",
                    presentCount: {
                        $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] }
                    },
                    totalCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "studentInfo"
                }
            },
            {
                $unwind: "$studentInfo"
            },
            {
                $project: {
                    name: "$studentInfo.name",
                    email: "$studentInfo.email",
                    presentCount: 1,
                    totalCount: 1,
                    percentage: {
                        $multiply: [
                            { $divide: ["$presentCount", "$totalCount"] },
                            100
                        ]
                    }
                }
            }
        ]);

        res.json({
            overall: {
                totalStudents,
                totalCampuses,
                ...formattedStats
            },
            studentStats
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    addStudent,
    getStudents,
    updateStudent,
    deleteStudent,
    getAllAttendance,
    manualMarkAttendance,
    createCampus,
    updateCampus,
    deleteCampus,
    getCampuses,
    getAnalytics,
    getCampus
};
