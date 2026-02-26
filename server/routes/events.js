const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

// GET /api/events - Public listing (only imported or new events)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      search,
      city = 'Sydney',
    } = req.query;

    const query = {
      status: { $in: ['new', 'updated', 'imported'] },
    };

    if (city) query.city = { $regex: city, $options: 'i' };
    if (category) query.category = { $regex: category, $options: 'i' };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { venueName: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Event.countDocuments(query);
    const events = await Event.find(query)
      .sort({ dateTime: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('-importedBy');

    res.json({
      events,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:id - Single event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
