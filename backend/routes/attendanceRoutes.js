const express = require('express');
const router = express.Router();
const { markAttendance, getStudentAttendance } = require('../controllers/attendanceController');
const { protectStudent } = require('../middleware/authMiddleware');

router.use(protectStudent);

router.post('/mark', markAttendance);
router.get('/student/:id', getStudentAttendance);

module.exports = router;
