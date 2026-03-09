const express = require('express');
const router = express.Router();
const { addStudent, getStudents, getAllAttendance, createGeofence, getGeofence, getAnalytics } = require('../controllers/adminController');
const { adminSignup, adminLogin } = require('../controllers/authController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.post('/signup', adminSignup);
router.post('/login', adminLogin);

router.use(protectAdmin);

router.post('/create-student', addStudent);
router.get('/students', getStudents);
router.get('/attendance', getAllAttendance);
router.get('/analytics', getAnalytics);
router.route('/geofence').get(getGeofence).post(createGeofence);

module.exports = router;
