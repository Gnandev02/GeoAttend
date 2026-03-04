const express = require('express');
const router = express.Router();
const { getStudentProfile, getStudentAttendance, markAttendance } = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/profile', getStudentProfile);
router.get('/attendance', getStudentAttendance);
router.post('/mark', markAttendance);

module.exports = router;
