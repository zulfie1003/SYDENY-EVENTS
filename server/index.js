require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const cors = require('cors');
const cron = require('node-cron');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

require('./config/passport');
const { runAllScrapers } = require('./services/scraperService');

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const adminRoutes = require('./routes/admin');
const emailRoutes = require('./routes/email');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Stricter limit for auth routes
  message: 'Too many login attempts, please try again later.',
});
app.use(limiter); // Apply general limiter to all requests

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'sydney-events-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // 7 days
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/email', emailRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Schedule scraping every hour
cron.schedule('0 * * * *', async () => {
  console.log('🕐 Running scheduled scrape...');
  try {
    await runAllScrapers();
    console.log('✅ Scheduled scrape completed');
  } catch (err) {
    console.error('❌ Scheduled scrape failed:', err);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  // Run initial scrape on startup
  setTimeout(async () => {
    console.log('🔍 Running initial scrape...');
    try {
      await runAllScrapers();
      console.log('✅ Initial scrape completed');
    } catch (err) {
      console.error('❌ Initial scrape failed:', err);
    }
  }, 3000);
});
