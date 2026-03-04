const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const Campus = require('./models/Campus');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const importData = async () => {
    try {
        await User.deleteMany();
        await Student.deleteMany();
        await Campus.deleteMany();

        const adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@geo.edu',
            password: 'password', // will be hashed by middleware
            role: 'admin'
        });

        const studentUser = await User.create({
            name: 'John Doe',
            email: 'student@geo.edu',
            password: 'password',
            role: 'student'
        });

        await Student.create({
            userId: studentUser._id,
            rollNumber: 'CS2024-001',
            department: 'Computer Science'
        });

        await Campus.create({
            name: 'Main Campus Simulator',
            latitude: 28.6139, // Example: New Delhi base
            longitude: 77.2090,
            radius: 500
        });

        console.log('Data Imported!');
        process.exit();
    } catch (error) {
        console.error(`Error with seed: ${error}`);
        process.exit(1);
    }
};

importData();
