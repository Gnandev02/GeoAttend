const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Campus = require('../models/Campus');
const { calculateDistance } = require('../utils/geoHelper');

// @desc    Get student profile
// @route   GET /api/student/profile
// @access  Private (student only)
const getStudentProfile = async (req, res) => {
    try {
        const student = await Student.findOne({ userId: req.user._id }).populate('userId', 'name email');

        if (!student) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        res.json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get student attendance history
// @route   GET /api/student/attendance
// @access  Private (student only)
const getStudentAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.find({ studentId: req.user._id }).sort({ createdAt: -1 });
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark attendance based on geolocation
// @route   POST /api/student/mark
// @access  Private (student only)
const markAttendance = async (req, res) => {
    try {
        const { lat, lng, sessionName } = req.body;

        if (!lat || !lng || !sessionName) {
            return res.status(400).json({ message: 'Location coordinates and session name are required' });
        }

        // Get student profile to find their assigned campus
        const student = await Student.findOne({ userId: req.user._id });
        if (!student || !student.campusId) {
            return res.status(400).json({ message: 'Student profile or assigned campus not found' });
        }

        // Get today's date in YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];

        // Anti-Proxy: Check if attendance already marked for this session today
        const existingAttendance = await Attendance.findOne({
            studentId: req.user._id,
            date: today,
            sessionName: sessionName,
            status: 'Present'
        });

        if (existingAttendance) {
            return res.status(400).json({ message: `Attendance already marked for ${sessionName} today` });
        }

        // Get assigned Campus details
        const campus = await Campus.findById(student.campusId);
        if (!campus) {
            return res.status(500).json({ message: 'Assigned campus geofence not found' });
        }

        // Calculate distance
        const distanceToCampus = calculateDistance(lat, lng, campus.latitude, campus.longitude);

        // Determine status
        const isInsideRadius = distanceToCampus <= campus.radius;
        const status = isInsideRadius ? 'Present' : 'Rejected';

        // Format time
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });

        // Save attendance record with campusId, distance and sessionName
        const attendance = await Attendance.create({
            studentId: req.user._id,
            campusId: campus._id,
            date: today,
            time,
            locationCoordinates: { lat, lng },
            status,
            distance: Math.round(distanceToCampus),
            sessionName
        });

        res.status(201).json({
            message: isInsideRadius ? 'Attendance marked successfully' : 'Attendance rejected: Outside campus radius',
            distance: Math.round(distanceToCampus),
            attendance
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getStudentProfile,
    getStudentAttendance,
    markAttendance
};
