const mongoose = require('mongoose');

const emailCaptureSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    consent: { type: Boolean, required: true, default: false },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    eventTitle: { type: String },
    eventSourceUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailCapture', emailCaptureSchema);
