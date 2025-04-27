// testSummary.js
require('dotenv').config();          // load .env
const { sendWeeklySummary } = require('./services/emailService');

(async () => {
  try {
    await sendWeeklySummary();
    console.log('Dry‐run complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error sending summary:', err);
    process.exit(1);
  }
})();

