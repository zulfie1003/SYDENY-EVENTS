/**
 * Puppeteer scraper for JavaScript-heavy event sites
 * Targets: Ticketek Sydney, Moshtix
 */
const puppeteer = require('puppeteer');

const SOURCE_NAME = 'Ticketek';

async function scrapeTicketek() {
  const events = [];
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    const urls = [
      { url: 'https://premier.ticketek.com.au/shows/genre.aspx?c=2048', category: 'Music' },
      { url: 'https://premier.ticketek.com.au/shows/genre.aspx?c=2049', category: 'Arts & Theatre' },
      { url: 'https://premier.ticketek.com.au/shows/genre.aspx?c=2050', category: 'Sport' },
    ];

    for (const { url, category } of urls) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const pageEvents = await page.evaluate((cat, sourceName) => {
          const results = [];
          const cards = document.querySelectorAll('.show-item, .event-card, [class*="ShowItem"], li[class*="event"]');

          cards.forEach(card => {
            try {
              const link = card.querySelector('a');
              const href = link?.getAttribute('href');
              if (!href) return;

              const fullUrl = href.startsWith('http')
                ? href
                : `https://premier.ticketek.com.au${href}`;

              const title =
                card.querySelector('h2, h3, [class*="title"], [class*="name"]')?.textContent?.trim() ||
                link.textContent?.trim();

              if (!title || title.length < 3) return;

              const imageUrl = card.querySelector('img')?.getAttribute('src');
              const dateText = card.querySelector('time, [class*="date"]')?.textContent?.trim();
              const venueText = card.querySelector('[class*="venue"], [class*="location"]')?.textContent?.trim();

              results.push({
                title,
                dateText: dateText || '',
                venueName: venueText || 'Sydney',
                address: venueText || '',
                city: 'Sydney',
                description: title,
                category: cat,
                imageUrl: imageUrl || null,
                sourceName,
                sourceUrl: fullUrl,
              });
            } catch {
              // skip
            }
          });

          return results;
        }, category, SOURCE_NAME);

        // Parse dates server-side
        for (const e of pageEvents) {
          let dateTime = null;
          if (e.dateText) {
            const parsed = new Date(e.dateText);
            if (!isNaN(parsed)) dateTime = parsed;
          }
          events.push({ ...e, dateTime });
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (urlErr) {
        console.warn(`[Ticketek] Failed ${url}: ${urlErr.message}`);
      }
    }
  } catch (err) {
    console.error('[Ticketek] Puppeteer scraper error:', err.message);
  } finally {
    if (browser) await browser.close();
  }

  // Deduplicate
  const seen = new Set();
  return events.filter(e => {
    if (seen.has(e.sourceUrl)) return false;
    seen.add(e.sourceUrl);
    return true;
  });
}

module.exports = { scrapeTicketek, SOURCE_NAME };
