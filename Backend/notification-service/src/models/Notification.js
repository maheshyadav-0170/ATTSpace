const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  attuid: { type: String, required: false },
  title: { type: String, required: true },
  body: { type: String, required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

notificationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

notificationSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);
