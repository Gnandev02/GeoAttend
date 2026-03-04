const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

// All routes are protected and require admin role
router.use(protect);
router.use(admin);

router.route('/student')
    .post(addStudent);

router.route('/students')
    .get(getStudents);

router.route('/student/:id')
    .put(updateStudent)
    .delete(deleteStudent);

router.route('/attendance')
    .get(getAllAttendance);

router.route('/analytics')
    .get(getAnalytics);

router.route('/manual')
    .post(manualMarkAttendance);

// Campus Management
router.route('/campus')
    .get(getCampus)
    .post(createCampus);

router.route('/campuses')
    .get(getCampuses);

router.route('/campus/:id')
    .put(updateCampus)
    .delete(deleteCampus);

module.exports = router;
