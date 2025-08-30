const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    attuid: { type: String, required: true, unique: true },
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true },
    jobTitle: { type: String, required: true },
    businessUnit: { type: String, required: true },
    manager: { type: String, required: true },
    shift: { type: String, default: null }
}, { collection: 'employees', timestamps: false });

module.exports = mongoose.model('Employee', EmployeeSchema);
