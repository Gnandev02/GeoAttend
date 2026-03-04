const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: String, // Storing as YYYY-MM-DD for easy querying
        required: true
    },
    time: {
        type: String, // Storing as HH:mm:ss for easy display
        required: true
    },
    locationCoordinates: {
        lat: {
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        }
    },
    status: {
        type: String,
        enum: ['Present', 'Rejected', 'Manual'],
        default: 'Present'
    },
    campusId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campus',
        required: true
    },
    distance: {
        type: Number, // Stored distance from center in meters
        required: true
    },
    sessionName: {
        type: String, // e.g., "Lecture 1", "Morning Session"
        required: [true, 'Please add a session name']
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Attendance', attendanceSchema);
