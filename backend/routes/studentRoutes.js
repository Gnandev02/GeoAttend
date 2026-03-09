const express = require('express');
const router = express.Router();
const { studentLogin } = require('../controllers/authController');
const { getStudentProfile } = require('../controllers/studentController');
const { protectStudent } = require('../middleware/authMiddleware');

router.post('/login', studentLogin);

router.use(protectStudent);
router.get('/profile', getStudentProfile);

module.exports = router;
