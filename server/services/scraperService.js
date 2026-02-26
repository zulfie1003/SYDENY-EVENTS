/**
 * Scraper Service
 * Orchestrates all scrapers and handles:
 *  - New event creation (status: "new")
 *  - Update detection and status update ("updated")
 *  - Inactive detection for events not found in current run ("inactive")
 */
const Event = require('../models/Event');
const { scrapeEventbrite } = require('../scrapers/eventbriteScraper');
const { scrapeWhatsOnSydney } = require('../scrapers/whatsOnSydneyScraper');
const { scrapeTicketek } = require('../scrapers/ticketekScraper');

/**
 * Compare two event records to detect meaningful changes
 */
function hasEventChanged(existing, scraped) {
  const fields = ['dateTime', 'venueName', 'description', 'imageUrl', 'title', 'address'];

  for (const field of fields) {
    const existingVal = existing[field];
    const scrapedVal = scraped[field];

    // Skip if both null/undefined
    if (!existingVal && !scrapedVal) continue;

    // Convert dates to comparable strings
    if (field === 'dateTime') {
      const existingDate = existingVal ? new Date(existingVal).toISOString() : null;
      const scrapedDate = scrapedVal ? new Date(scrapedVal).toISOString() : null;
      if (existingDate !== scrapedDate) return true;
      continue;
    }

    if (String(existingVal || '').trim() !== String(scrapedVal || '').trim()) {
      return true;
    }
  }

  return false;
}

/**
 * Process scraped events from one source
 * Returns stats object
 */
async function processScrapedEvents(scrapedEvents) {
  const stats = { created: 0, updated: 0, unchanged: 0, errors: 0 };
  const processedUrls = new Set();

  for (const scraped of scrapedEvents) {
    try {
      if (!scraped.sourceUrl || !scraped.title) continue;
      processedUrls.add(scraped.sourceUrl);

      const existing = await Event.findOne({ sourceUrl: scraped.sourceUrl });

      if (!existing) {
        // New event
        await Event.create({
          ...scraped,
          status: 'new',
          lastScrapedAt: new Date(),
        });
        stats.created++;
      } else {
        // Check if imported — don't downgrade imported status
        if (existing.status === 'imported') {
          await Event.findByIdAndUpdate(existing._id, { lastScrapedAt: new Date() });
          stats.unchanged++;
          continue;
        }

        if (hasEventChanged(existing, scraped)) {
          // Update event with changed fields
          await Event.findByIdAndUpdate(existing._id, {
            title: scraped.title,
            dateTime: scraped.dateTime,
            venueName: scraped.venueName,
            address: scraped.address,
            description: scraped.description,
            imageUrl: scraped.imageUrl,
            category: scraped.category,
            lastScrapedAt: new Date(),
            status: 'updated',
          });
          stats.updated++;
        } else {
          // No changes, just update lastScrapedAt
          await Event.findByIdAndUpdate(existing._id, { lastScrapedAt: new Date() });
          stats.unchanged++;
        }
      }
    } catch (err) {
      console.error(`[ScraperService] Error processing ${scraped.sourceUrl}:`, err.message);
      stats.errors++;
    }
  }

  return { stats, processedUrls };
}

/**
 * Mark events as inactive if they weren't found in current scrape run
 * Only applies to events from the same sourceName
 */
async function markInactiveEvents(sourceNames, allProcessedUrls) {
  let inactiveCount = 0;

  for (const sourceName of sourceNames) {
    const result = await Event.updateMany(
      {
        sourceName,
        sourceUrl: { $nin: Array.from(allProcessedUrls) },
        status: { $nin: ['inactive', 'imported'] },
      },
      {
        $set: { status: 'inactive' },
      }
    );
    inactiveCount += result.modifiedCount;
  }

  return inactiveCount;
}

/**
 * Main orchestrator: runs all scrapers and processes results
 */
async function runAllScrapers() {
  const startTime = Date.now();
  console.log('[ScraperService] Starting scrape run...');

  const allResults = {
    eventbrite: { events: [], stats: null },
    whatsOnSydney: { events: [], stats: null },
    ticketek: { events: [], stats: null },
  };

  // Run scrapers (with graceful failure per source)
  try {
    console.log('[ScraperService] Scraping Eventbrite...');
    allResults.eventbrite.events = await scrapeEventbrite();
    console.log(`[ScraperService] Eventbrite: ${allResults.eventbrite.events.length} events found`);
  } catch (err) {
    console.error('[ScraperService] Eventbrite failed:', err.message);
  }

  try {
    console.log("[ScraperService] Scraping What's On Sydney...");
    allResults.whatsOnSydney.events = await scrapeWhatsOnSydney();
    console.log(`[ScraperService] What's On: ${allResults.whatsOnSydney.events.length} events found`);
  } catch (err) {
    console.error("[ScraperService] What's On Sydney failed:", err.message);
  }

  try {
    console.log('[ScraperService] Scraping Ticketek...');
    allResults.ticketek.events = await scrapeTicketek();
    console.log(`[ScraperService] Ticketek: ${allResults.ticketek.events.length} events found`);
  } catch (err) {
    console.error('[ScraperService] Ticketek failed:', err.message);
  }

  // Process all scraped events
  const allProcessedUrls = new Set();
  const sourceNames = new Set();
  let totalStats = { created: 0, updated: 0, unchanged: 0, errors: 0 };

  for (const [key, result] of Object.entries(allResults)) {
    if (result.events.length > 0) {
      const { stats, processedUrls } = await processScrapedEvents(result.events);
      allResults[key].stats = stats;

      // Accumulate
      for (const url of processedUrls) allProcessedUrls.add(url);
      result.events.forEach(e => e.sourceName && sourceNames.add(e.sourceName));

      totalStats.created += stats.created;
      totalStats.updated += stats.updated;
      totalStats.unchanged += stats.unchanged;
      totalStats.errors += stats.errors;
    }
  }

  // Mark inactive events (only if we had any successful scrapes)
  let inactiveCount = 0;
  if (allProcessedUrls.size > 0 && sourceNames.size > 0) {
    inactiveCount = await markInactiveEvents(Array.from(sourceNames), allProcessedUrls);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const summary = {
    duration: `${duration}s`,
    totalScraped: allProcessedUrls.size,
    created: totalStats.created,
    updated: totalStats.updated,
    unchanged: totalStats.unchanged,
    markedInactive: inactiveCount,
    errors: totalStats.errors,
  };

  console.log('[ScraperService] Scrape run complete:', summary);
  return summary;
}

module.exports = { runAllScrapers, processScrapedEvents, markInactiveEvents };
