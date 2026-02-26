# Sydney Events Platform

A production-ready MERN stack application that automatically scrapes Sydney events, detects changes, and provides a public-facing UI and admin dashboard with Google OAuth.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (React/Vite)                   │
│  HomePage → EventCard → EmailModal (public)                  │
│  LoginPage (Google OAuth)                                    │
│  DashboardPage → EventDetailPanel (protected admin)          │
└───────────────────────┬─────────────────────────────────────┘
                        │ Axios (credentials: true)
                        │ /api/*  (Vite proxy → Express)
┌───────────────────────▼─────────────────────────────────────┐
│                   SERVER (Express)                           │
│                                                              │
│  /api/auth    → Passport.js Google OAuth                     │
│  /api/events  → Public event listing & detail               │
│  /api/admin   → Protected: CRUD, import, scrape trigger      │
│  /api/email   → Email capture with consent                  │
│                                                              │
│  ┌──────────────────────────────────────┐                   │
│  │         Scraper Service              │                   │
│  │   eventbriteScraper (Axios/Cheerio)  │◄─── node-cron    │
│  │   whatsOnSydneyScraper (Axios/Cheerio)│    (hourly)      │
│  │   ticketekScraper (Puppeteer)        │                   │
│  └──────────────────────────────────────┘                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ Mongoose ODM
┌───────────────────────▼─────────────────────────────────────┐
│                     MongoDB                                  │
│  Collections: events, users, emailcaptures                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
sydney-events/
├── package.json              # Root — concurrently dev script
├── docker-compose.yml        # Production containerization
│
├── server/
│   ├── index.js              # Express app + cron scheduler
│   ├── Dockerfile
│   ├── .env.example
│   ├── config/
│   │   └── passport.js       # Google OAuth strategy
│   ├── models/
│   │   ├── Event.js          # Full event schema + indexes
│   │   ├── User.js           # Admin user schema
│   │   └── EmailCapture.js   # Email + consent storage
│   ├── routes/
│   │   ├── auth.js           # /api/auth/* (Google OAuth)
│   │   ├── events.js         # /api/events/* (public)
│   │   ├── admin.js          # /api/admin/* (protected)
│   │   └── email.js          # /api/email/* (capture)
│   ├── middleware/
│   │   └── auth.js           # ensureAuthenticated, ensureAdmin
│   ├── scrapers/
│   │   ├── eventbriteScraper.js   # Axios + Cheerio
│   │   ├── whatsOnSydneyScraper.js # Axios + Cheerio (2 sources)
│   │   └── ticketekScraper.js     # Puppeteer (JS-heavy)
│   ├── services/
│   │   └── scraperService.js # Orchestration + update detection
│   └── scripts/
│       └── scrapeOnce.js     # CLI scrape trigger
│
└── client/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── App.jsx            # Router + ProtectedRoute
        ├── main.jsx
        ├── index.css          # Tailwind + custom tokens
        ├── hooks/
        │   └── useAuth.jsx    # AuthContext provider
        ├── services/
        │   └── api.js         # Axios instance + all API calls
        ├── components/
        │   ├── Navbar.jsx
        │   ├── StatusBadge.jsx
        │   ├── EventCard.jsx
        │   ├── EmailModal.jsx
        │   └── EventDetailPanel.jsx
        └── pages/
            ├── HomePage.jsx   # Public event listing
            ├── LoginPage.jsx  # Google OAuth redirect
            ├── DashboardPage.jsx # Admin (protected)
            └── NotFoundPage.jsx
```

---

## Scraper Logic

### Sources
1. **Eventbrite** (`eventbriteScraper.js`) — Axios + Cheerio against Eventbrite AU listing pages for Music, Food & Drink, and General categories.
2. **What's On Sydney / Sydney.com** (`whatsOnSydneyScraper.js`) — Axios + Cheerio against `whatson.cityofsydney.nsw.gov.au` and `sydney.com/events`.
3. **Ticketek** (`ticketekScraper.js`) — Puppeteer with headless Chromium for JS-rendered content on `premier.ticketek.com.au`.

### Per-Run Process (in `scraperService.js`)

```
For each scraper:
  1. Fetch raw HTML / render with Puppeteer
  2. Parse event cards → normalize to common shape:
     { title, dateTime, venueName, address, description, imageUrl, sourceUrl, sourceName }
  3. Deduplicate within the scraper run by sourceUrl

For each scraped event:
  ┌─ sourceUrl NOT in DB? ─────► Create event, status = "new"
  │
  └─ sourceUrl EXISTS in DB?
       │
       ├─ status == "imported"? ──► Only update lastScrapedAt (protect imported status)
       │
       └─ Compare key fields (title, dateTime, venueName, address, description, imageUrl)
              │
              ├─ Changed? ──► Update fields + status = "updated"
              └─ Unchanged? ──► Only update lastScrapedAt (status preserved)

After processing all scraped events for a source:
  → Any DB event from that sourceName whose sourceUrl was NOT in the current
    scrape run AND status != "imported" → mark status = "inactive"
```

### Change Detection

The `hasEventChanged()` function compares these fields:
- `title` — string equality
- `dateTime` — ISO string comparison (ignores millisecond noise)
- `venueName` — trimmed string equality
- `address` — trimmed string equality
- `description` — trimmed string equality
- `imageUrl` — string equality

---

## Status Lifecycle

```
Scraper finds NEW event         →  status: "new"
Scraper finds CHANGED data      →  status: "updated"
Admin clicks "Import"           →  status: "imported"  (importedAt, importedBy set)
Event NOT found in scrape run   →  status: "inactive"
```

**Important rules:**
- `imported` events are **never** automatically changed by the scraper.
- Admins can manually override status via the dropdown in the detail panel.
- `inactive` events are preserved in the DB — they don't get deleted.

---

## How to Run Locally

### Prerequisites
- Node.js 20+
- MongoDB (local or MongoDB Atlas)
- Google OAuth credentials (see below)

### 1. Clone & Install

```bash
git clone <repo-url>
cd sydney-events
npm run install:all
```

### 2. Configure Environment

```bash
# Server environment
cp server/.env.example server/.env
# Edit server/.env with your values
```

Required values in `server/.env`:
```
MONGODB_URI=mongodb://localhost:27017/sydney-events
SESSION_SECRET=<random 64-char string>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
CLIENT_URL=http://localhost:5175
```

### 3. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID (Web Application)
3. Add Authorized Redirect URI: `http://localhost:5000/api/auth/google/callback`
4. Copy Client ID and Secret to your `.env`

### 4. Start Development Servers

```bash
# From root directory — starts both server + client with hot reload
npm run dev
```

- Frontend: http://localhost:5175+ (may increment if ports busy)
- Backend API: http://localhost:3000

### 5. Trigger Initial Scrape

The server automatically runs a scrape 3 seconds after startup.  
To run manually:

```bash
cd server && npm run scrape
```

Or via the admin dashboard "Scrape Now" button.

---

## Production Deployment (Docker)

```bash
# Create production .env at root
cat > .env << EOF
SESSION_SECRET=your-production-secret
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
CLIENT_URL=https://yourdomain.com
EOF

# Build and start
docker-compose up --build -d
```

The stack runs:
- MongoDB on port 27017 (internal)
- Express API on port 5000
- Nginx serving React on port 80

---

## API Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/auth/google` | — | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | — | OAuth callback |
| GET | `/api/auth/me` | — | Get current user |
| POST | `/api/auth/logout` | — | Log out |
| GET | `/api/events` | — | Public event list |
| GET | `/api/events/:id` | — | Single event |
| POST | `/api/email/capture` | — | Capture email + consent |
| GET | `/api/admin/events` | ✓ | Admin event list with filters |
| POST | `/api/admin/events/:id/import` | ✓ | Import event to platform |
| PATCH | `/api/admin/events/:id/status` | ✓ | Update event status |
| DELETE | `/api/admin/events/:id` | ✓ Admin | Delete event |
| POST | `/api/admin/scrape` | ✓ Admin | Trigger manual scrape |
| GET | `/api/admin/stats` | ✓ | Dashboard statistics |
| GET | `/api/admin/emails` | ✓ Admin | Email captures list |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, Axios, React Router v6 |
| Backend | Node.js, Express 4 |
| Database | MongoDB 7, Mongoose |
| Auth | Passport.js, passport-google-oauth20, express-session |
| Scraping | Puppeteer (headless Chrome), Axios, Cheerio |
| Scheduling | node-cron |
| Deployment | Docker, Docker Compose, Nginx |

---

## Update Detection Deep Dive

When the scraper runs hourly via node-cron, here's the exact comparison logic:

```javascript
function hasEventChanged(existing, scraped) {
  const fields = ['dateTime', 'venueName', 'description', 'imageUrl', 'title', 'address'];
  
  for (const field of fields) {
    if (field === 'dateTime') {
      // Compare as ISO strings to handle timezone/format differences
      const a = existing.dateTime ? new Date(existing.dateTime).toISOString() : null;
      const b = scraped.dateTime ? new Date(scraped.dateTime).toISOString() : null;
      if (a !== b) return true;
    } else {
      if (String(existing[field] || '').trim() !== String(scraped[field] || '').trim())
        return true;
    }
  }
  return false;
}
```

This ensures:
- Whitespace changes don't falsely trigger `updated`
- Date format normalization prevents false positives
- `null` vs `undefined` treated consistently
- Imported events are never auto-downgraded

---

## Scraping Notes & Limitations

Web scraping is subject to site changes. If a scraper returns 0 results:
1. Check server logs for specific error messages
2. The site's HTML structure may have changed — update selectors in the scraper file
3. Some sites may block scrapers — consider adding delays or rotating user agents

The platform is designed so that **zero results from a failed scrape does NOT mark all events inactive** — the inactive logic only fires when `allProcessedUrls.size > 0`, preventing false mass-inactivation.

---

## Production Readiness Checklist

Before deploying to production, ensure the following are configured:

### ✅ Security
- [ ] **SESSION_SECRET** - Generate a strong random 64+ character string (not the default)
- [ ] **Google OAuth** - Use real credentials from Google Cloud Console, not placeholders
- [ ] **MongoDB** - Use MongoDB Atlas or secured instance with authentication
- [ ] **CORS** - Set `CLIENT_URL` to your actual production domain
- [ ] **Helmet.js** - Security headers already configured ✓
- [ ] **Rate limiting** - General & auth rate limits already configured ✓

### ✅ Environment Variables
- [ ] All `.env` values match your production infrastructure
- [ ] Never commit `.env` to version control
- [ ] Use secrets management (AWS Secrets Manager, Vercel Env, etc.)

### ✅ Database
- [ ] MongoDB indexes created (Mongoose handles this automatically)
- [ ] Database backups configured
- [ ] Connection pooling optimized for production traffic

### ✅ Deployment
- [ ] Docker images built and tested
- [ ] `docker-compose.yml` updated with production database URL
- [ ] SSL/TLS certificates configured (use reverse proxy like Nginx)
- [ ] Environment variables configured in deployment platform

### ✅ Monitoring & Logging
- [ ] Add structured logging (e.g., Winston, Pino)
- [ ] Configure error tracking (e.g., Sentry)
- [ ] Set up uptime monitoring
- [ ] Monitor scraper failures

### ⚠️ Known Limitations
- **Scraper reliability** - Web scraping depends on site structure; sites may block or change selectors
- **Puppeteer overhead** - Ticketek scraper requires headless Chrome; consider horizontal scaling
- **No caching** - Add Redis caching for high-traffic scenarios
- **No pagination optimization** - Implement cursor-based pagination for large datasets
- **Email validation** - Consider adding email verification before accepting captures

### 🚀 Recommended Improvements
1. **Testing** - Add test suites (Jest, Mocha) before production
2. **API Documentation** - Generate with Swagger/OpenAPI
3. **Pagination** - Implement cursor-based pagination for event lists
4. **Caching** - Add Redis for frequently accessed data
5. **Queue Jobs** - Use Bull for async scraper jobs instead of node-cron
6. **CDN** - Serve static images through CDN
7. **Analytics** - Track user behavior and event popularity

---
