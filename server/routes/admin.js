const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const EmailCapture = require('../models/EmailCapture');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');
const { runAllScrapers } = require('../services/scraperService');

// All admin routes require authentication
router.use(ensureAuthenticated);

// GET /api/admin/events - Full event list with advanced filters
router.get('/events', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      city = 'Sydney',
      search,
      status,
      category,
      dateFrom,
      dateTo,
      sourceName,
    } = req.query;

    const query = {};

    if (city) query.city = { $regex: city, $options: 'i' };
    if (status) query.status = status;
    if (category) query.category = { $regex: category, $options: 'i' };
    if (sourceName) query.sourceName = { $regex: sourceName, $options: 'i' };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { venueName: { $regex: search, $options: 'i' } },
      ];
    }

    if (dateFrom || dateTo) {
      query.dateTime = {};
      if (dateFrom) query.dateTime.$gte = new Date(dateFrom);
      if (dateTo) query.dateTime.$lte = new Date(dateTo);
    }

    const total = await Event.countDocuments(query);
    const events = await Event.find(query)
      .populate('importedBy', 'name email avatar')
      .sort({ lastScrapedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Status summary counts
    const statusCounts = await Event.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      events,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
      statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/events/:id/import - Import event to platform
router.post('/events/:id/import', async (req, res) => {
  try {
    const { importNotes } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ error: 'Event not found' });

    event.status = 'imported';
    event.importedAt = new Date();
    event.importedBy = req.user._id;
    if (importNotes) event.importNotes = importNotes;
    await event.save();

    await event.populate('importedBy', 'name email avatar');
    res.json({ message: 'Event imported successfully', event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/events/:id/status - Manually change status
router.patch('/events/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'updated', 'inactive', 'imported'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('importedBy', 'name email avatar');

    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/events/:id
router.delete('/events/:id', ensureAdmin, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/scrape - Trigger manual scrape
router.post('/scrape', ensureAdmin, async (req, res) => {
  try {
    res.json({ message: 'Scrape started. Check server logs for progress.' });
    // Run in background
    runAllScrapers().catch(err => console.error('Manual scrape error:', err));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/emails - Email captures
router.get('/emails', ensureAdmin, async (req, res) => {
  try {
    const emails = await EmailCapture.find().sort({ createdAt: -1 }).limit(100);
    res.json(emails);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats - Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [statusCounts, totalEmails, recentEvents] = await Promise.all([
      Event.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      EmailCapture.countDocuments(),
      Event.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    ]);

    const sources = await Event.aggregate([
      { $group: { _id: '$sourceName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      totalEmails,
      recentEvents,
      sources,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
