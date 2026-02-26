/**
 * Scraper for Eventbrite Sydney events
 * Uses Axios + Cheerio for lightweight HTML parsing
 */
const axios = require('axios');
const cheerio = require('cheerio');

const SOURCE_NAME = 'Eventbrite';

async function scrapeEventbrite() {
  const events = [];

  try {
    const urls = [
      'https://www.eventbrite.com.au/d/australia--sydney/events/',
      'https://www.eventbrite.com.au/d/australia--sydney/music/',
      'https://www.eventbrite.com.au/d/australia--sydney/food-and-drink/',
    ];

    for (const url of urls) {
      try {
        const { data } = await axios.get(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-AU,en;q=0.9',
          },
          timeout: 15000,
        });

        const $ = cheerio.load(data);

        // Eventbrite listing cards
        $('[data-testid="event-card"]').each((i, el) => {
          try {
            const $el = $(el);
            const title = $el.find('[data-testid="event-card-title"]').text().trim() ||
                          $el.find('h3').first().text().trim();
            const sourceUrl = $el.find('a').first().attr('href');
            const imageUrl = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');
            const dateText = $el.find('[data-testid="event-card-date"]').text().trim() ||
                             $el.find('time').first().text().trim() ||
                             $el.find('[class*="date"]').first().text().trim();
            const venueText = $el.find('[data-testid="event-card-venue"]').text().trim() ||
                              $el.find('[class*="venue"]').first().text().trim() ||
                              $el.find('[class*="location"]').first().text().trim();

            if (!title || !sourceUrl) return;

            const fullUrl = sourceUrl.startsWith('http')
              ? sourceUrl
              : `https://www.eventbrite.com.au${sourceUrl}`;

            // Parse date
            let dateTime = null;
            if (dateText) {
              const parsed = new Date(dateText);
              if (!isNaN(parsed)) dateTime = parsed;
            }

            events.push({
              title,
              dateTime,
              venueName: venueText || 'Sydney',
              address: venueText || '',
              city: 'Sydney',
              description: title,
              category: 'General',
              imageUrl: imageUrl || null,
              sourceName: SOURCE_NAME,
              sourceUrl: fullUrl,
            });
          } catch (innerErr) {
            // skip malformed card
          }
        });

        // Fallback: try other selectors
        if (events.length === 0) {
          $('article, .eds-event-card-content, [class*="EventCard"], li[class*="event"]').each((i, el) => {
            try {
              const $el = $(el);
              const link = $el.find('a[href*="/e/"]').first();
              const title = link.text().trim() || $el.find('h2,h3').first().text().trim();
              const href = link.attr('href');
              if (!title || !href) return;

              const fullUrl = href.startsWith('http') ? href : `https://www.eventbrite.com.au${href}`;
              const imageUrl = $el.find('img').first().attr('src');
              const dateText = $el.find('time, [class*="date"]').first().text().trim();

              let dateTime = null;
              if (dateText) {
                const parsed = new Date(dateText);
                if (!isNaN(parsed)) dateTime = parsed;
              }

              events.push({
                title,
                dateTime,
                venueName: 'Sydney',
                address: '',
                city: 'Sydney',
                description: title,
                category: 'General',
                imageUrl: imageUrl || null,
                sourceName: SOURCE_NAME,
                sourceUrl: fullUrl,
              });
            } catch {
              // skip
            }
          });
        }

        await sleep(1500);
      } catch (urlErr) {
        console.warn(`[Eventbrite] Failed to scrape ${url}:`, urlErr.message);
      }
    }
  } catch (err) {
    console.error('[Eventbrite] Scraper error:', err.message);
  }

  // Deduplicate by sourceUrl
  const seen = new Set();
  return events.filter(e => {
    if (seen.has(e.sourceUrl)) return false;
    seen.add(e.sourceUrl);
    return true;
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { scrapeEventbrite, SOURCE_NAME };
