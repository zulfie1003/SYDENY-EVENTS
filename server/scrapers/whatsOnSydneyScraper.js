/**
 * Scraper for What's On Sydney (whatson.cityofsydney.nsw.gov.au) and fallback sources
 * Uses Axios + Cheerio
 */
const axios = require('axios');
const cheerio = require('cheerio');

const SOURCE_NAME = 'What\'s On Sydney';

async function scrapeWhatsOnSydney() {
  const events = [];

  const sources = [
    {
      url: 'https://whatson.cityofsydney.nsw.gov.au/events',
      name: "What's On Sydney",
      parse: parseWhatsOnSydney,
    },
    {
      url: 'https://www.sydney.com/events',
      name: 'Sydney.com',
      parse: parseSydneyDotCom,
    },
  ];

  for (const source of sources) {
    try {
      const { data } = await axios.get(source.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 15000,
      });

      const parsed = source.parse(data, source.name, source.url);
      events.push(...parsed);
      console.log(`[${source.name}] Scraped ${parsed.length} events`);

      await sleep(1500);
    } catch (err) {
      console.warn(`[${source.name}] Scrape failed: ${err.message}`);
    }
  }

  // Deduplicate
  const seen = new Set();
  return events.filter(e => {
    if (seen.has(e.sourceUrl)) return false;
    seen.add(e.sourceUrl);
    return true;
  });
}

function parseWhatsOnSydney(html, sourceName, baseUrl) {
  const $ = cheerio.load(html);
  const events = [];
  const base = 'https://whatson.cityofsydney.nsw.gov.au';

  $('article, .event-card, [class*="EventCard"], [class*="event-item"], .card').each((i, el) => {
    try {
      const $el = $(el);
      const link = $el.find('a').first();
      const href = link.attr('href');
      if (!href) return;

      const fullUrl = href.startsWith('http') ? href : `${base}${href}`;
      const title =
        $el.find('h2, h3, [class*="title"], [class*="heading"]').first().text().trim() ||
        link.text().trim();
      if (!title || title.length < 3) return;

      const imageUrl =
        $el.find('img').first().attr('src') ||
        $el.find('img').first().attr('data-src');
      const dateText = $el.find('time, [class*="date"], [datetime]').first().text().trim();
      const venueText = $el.find('[class*="venue"], [class*="location"]').first().text().trim();
      const description = $el.find('[class*="description"], [class*="excerpt"], p').first().text().trim();

      let dateTime = null;
      const dateAttr = $el.find('[datetime]').attr('datetime');
      if (dateAttr) {
        const parsed = new Date(dateAttr);
        if (!isNaN(parsed)) dateTime = parsed;
      } else if (dateText) {
        const parsed = new Date(dateText);
        if (!isNaN(parsed)) dateTime = parsed;
      }

      events.push({
        title,
        dateTime,
        venueName: venueText || 'Sydney CBD',
        address: venueText || '',
        city: 'Sydney',
        description: description || title,
        category: 'Arts & Culture',
        imageUrl: imageUrl || null,
        sourceName,
        sourceUrl: fullUrl,
      });
    } catch {
      // skip
    }
  });

  return events;
}

function parseSydneyDotCom(html, sourceName, baseUrl) {
  const $ = cheerio.load(html);
  const events = [];
  const base = 'https://www.sydney.com';

  $('[class*="card"], [class*="listing"], article, .event').each((i, el) => {
    try {
      const $el = $(el);
      const link = $el.find('a[href*="/event"]').first() || $el.find('a').first();
      const href = link.attr('href');
      if (!href) return;

      const fullUrl = href.startsWith('http') ? href : `${base}${href}`;
      if (!fullUrl.includes('sydney')) return;

      const title = $el.find('h2, h3, [class*="title"]').first().text().trim() || link.text().trim();
      if (!title || title.length < 3) return;

      const imageUrl = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');
      const dateText = $el.find('time, [class*="date"]').first().text().trim();
      const venueText = $el.find('[class*="venue"], [class*="location"]').first().text().trim();
      const description = $el.find('p, [class*="description"]').first().text().trim();

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
        description: description || title,
        category: 'Tourism',
        imageUrl: imageUrl || null,
        sourceName,
        sourceUrl: fullUrl,
      });
    } catch {
      // skip
    }
  });

  return events;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { scrapeWhatsOnSydney, SOURCE_NAME };
