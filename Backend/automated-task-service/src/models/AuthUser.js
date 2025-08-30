const mongoose = require('mongoose');

const AuthUserSchema = new mongoose.Schema({
    attuid: { type: String, required: true, unique: true },
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    jobTitle: { type: String, required: true },
    businessUnit: { type: String, required: true },
    manager: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    password: { type: String, default: null },
    createdDate: { type: Date, default: Date.now },
    lastModified: { type: Date, default: Date.now },
    lastPasswordChanged: { type: Date },
    shift: { type: String, default: null } 
}, { collection: 'authusers' });

module.exports = mongoose.model('AuthUser', AuthUserSchema);
