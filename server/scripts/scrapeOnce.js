require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { runAllScrapers } = require('../services/scraperService');

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Starting scrape...\n');

  const summary = await runAllScrapers();

  console.log('\n=== Scrape Summary ===');
  console.table(summary);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
