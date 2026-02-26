const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    googleId: { type: String, unique: true, sparse: true },
    avatar: { type: String },
    role: { type: String, enum: ['admin', 'viewer'], default: 'admin' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
