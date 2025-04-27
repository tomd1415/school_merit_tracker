// schedulers/summaryScheduler.js
const cron = require('node-cron');
const { sendWeeklySummary } = require('../services/emailService');

// Runs every Wednesday at 14:00 Europe/London
cron.schedule('0 14 * * 3', () => {
  console.log('Running weekly summary job…');
  sendWeeklySummary().catch(err => {
    console.error('Error in weekly summary job:', err);
  });
}, {
  timezone: 'Europe/London'
});

