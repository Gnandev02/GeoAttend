const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Campus = require('../models/Campus');
const Attendance = require('../models/Attendance');
const { calculateDistance } = require('../utils/geoHelper');

dotenv.config();

const runTests = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // 1. Verify Geofencing Logic
        console.log('\n--- Testing Geofencing Logic ---');
        const campus = { lat: 12.9716, lng: 77.5946, radius: 100 }; // Example: Bangalore Center
        const insidePoint = { lat: 12.9717, lng: 77.5947 };
        const outsidePoint = { lat: 13.0, lng: 77.6 };

        const distInside = calculateDistance(insidePoint.lat, insidePoint.lng, campus.lat, campus.lng);
        const distOutside = calculateDistance(outsidePoint.lat, outsidePoint.lng, campus.lat, campus.lng);

        console.log(`Point Inside: ${Math.round(distInside)}m (Expected: <100m) - ${distInside <= campus.radius ? 'PASS' : 'FAIL'}`);
        console.log(`Point Outside: ${Math.round(distOutside)}m (Expected: >100m) - ${distOutside > campus.radius ? 'PASS' : 'FAIL'}`);

        // 2. Verify Models
        console.log('\n--- Verifying Model Schema ---');
        const userFields = Object.keys(User.schema.paths);
        const attendanceFields = Object.keys(Attendance.schema.paths);

        console.log(`User model includes campusId: ${userFields.includes('campusId') ? 'PASS' : 'FAIL'}`);
        console.log(`Attendance model includes sessionName: ${attendanceFields.includes('sessionName') ? 'PASS' : 'FAIL'}`);

        console.log('\nVerification complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error during verification:', error);
        process.exit(1);
    }
};

runTests();
