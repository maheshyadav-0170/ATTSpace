const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, // e.g., "09:00"
  endTime: { type: String, required: true }, // e.g., "09:30"
  date: { type: Date, required: true }, // Booking date
});

const gameBookingSchema = new mongoose.Schema({
  gameType: {
    type: String,
    enum: ['carrom', 'chess', 'foosball', 'table_tennis'],
    required: true,
  },
  bookingType: {
    type: String,
    enum: ['private', 'arena'],
    required: true,
  },
  players: [{
    attuid: { type: String, required: true },
    checkinStatus: { type: Boolean, default: false },
  }],
  slot: { type: slotSchema, required: true },
  location: { type: String, required: true }, // e.g., "Arena 1"
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const scoreSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameBooking',
    required: true,
  },
  gameType: {
    type: String,
    enum: ['carrom', 'chess', 'foosball', 'table_tennis'],
    required: true,
  },
  scores: [{
    attuid: { type: String, required: true },
    score: { type: Number, required: true },
  }],
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = {
  GameBooking: mongoose.model('GameBooking', gameBookingSchema),
  Score: mongoose.model('Score', scoreSchema),
};