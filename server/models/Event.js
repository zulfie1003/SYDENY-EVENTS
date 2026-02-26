const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    dateTime: { type: Date },
    venueName: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, default: 'Sydney', trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    imageUrl: { type: String },
    sourceName: { type: String, required: true },
    sourceUrl: { type: String, required: true, unique: true },
    lastScrapedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['new', 'updated', 'inactive', 'imported'],
      default: 'new',
    },
    importedAt: { type: Date },
    importedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    importNotes: { type: String },
  },
  { timestamps: true }
);

// Text index for search
eventSchema.index({ title: 'text', description: 'text', venueName: 'text' });
eventSchema.index({ status: 1 });
eventSchema.index({ dateTime: 1 });
eventSchema.index({ city: 1 });

module.exports = mongoose.model('Event', eventSchema);
