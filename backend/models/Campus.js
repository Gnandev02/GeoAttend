const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a campus name'],
        default: 'Main Campus'
    },
    latitude: {
        type: Number,
        required: [true, 'Please add latitude']
    },
    longitude: {
        type: Number,
        required: [true, 'Please add longitude']
    },
    radius: {
        type: Number,
        required: [true, 'Please add radius in meters']
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Campus', campusSchema);
