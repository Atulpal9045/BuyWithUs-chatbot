const mongoose = require('mongoose');

const User = mongoose.model('User', new mongoose.Schema({
    session_id: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
    },
    email: {
        type: String,
    },
    contact: {
        type: String,
    },
    property_type: {
        type: String,
    },
    preferred_area: {
        type: String
    },
    selected_list: {
        type: String
    },
    schedule_day: {
        type: String
    },
    schedule_time: {
        type: String
    },
    inspection: {
        type: Boolean
    },
    bedrooms: {
        type: Number
    }
}));

exports.User = User;