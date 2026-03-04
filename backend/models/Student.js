const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rollNumber: {
        type: String,
        required: [true, 'Please add a roll number'],
        unique: true
    },
    department: {
        type: String,
        required: [true, 'Please add a department']
    },
    campusId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campus',
        required: [true, 'Please assign a campus']
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Student', studentSchema);
