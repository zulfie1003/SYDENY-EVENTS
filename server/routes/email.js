const express = require('express');
const router = express.Router();
const EmailCapture = require('../models/EmailCapture');
const Event = require('../models/Event');

// POST /api/email/capture
router.post('/capture', async (req, res) => {
  try {
    const { email, consent, eventId } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!consent) return res.status(400).json({ error: 'Consent is required' });

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    let eventTitle = null;
    let eventSourceUrl = null;

    if (eventId) {
      const event = await Event.findById(eventId);
      if (event) {
        eventTitle = event.title;
        eventSourceUrl = event.sourceUrl;
      }
    }

    const capture = await EmailCapture.create({
      email: email.toLowerCase().trim(),
      consent: Boolean(consent),
      eventId: eventId || null,
      eventTitle,
      eventSourceUrl,
    });

    res.status(201).json({
      message: 'Email captured successfully',
      id: capture._id,
      sourceUrl: eventSourceUrl,
    });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate - still return success with sourceUrl
      const event = req.body.eventId ? await Event.findById(req.body.eventId) : null;
      return res.json({
        message: 'Already registered',
        sourceUrl: event?.sourceUrl || null,
      });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
