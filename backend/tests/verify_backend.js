const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');
const Geofence = require('../models/Geofence');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

dotenv.config();

const runTests = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/geoattend_test');
        console.log('Connected.');

        // 1. Verify Model Integrity
        console.log('\n--- Verifying Model Schema ---');

        const adminFields = Object.keys(Admin.schema.paths);
        const geofenceFields = Object.keys(Geofence.schema.paths);
        const studentFields = Object.keys(Student.schema.paths);
        const attendanceFields = Object.keys(Attendance.schema.paths);

        console.log(`Admin model includes collegeCode: ${adminFields.includes('collegeCode') ? 'PASS' : 'FAIL'}`);
        console.log(`Geofence model includes collegeCode: ${geofenceFields.includes('collegeCode') ? 'PASS' : 'FAIL'}`);
        console.log(`Student model includes collegeCode: ${studentFields.includes('collegeCode') ? 'PASS' : 'FAIL'}`);
        console.log(`Attendance model includes collegeCode: ${attendanceFields.includes('collegeCode') ? 'PASS' : 'FAIL'}`);

        console.log('\nVerification complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error during verification:', error);
        process.exit(1);
    }
};

runTests();
