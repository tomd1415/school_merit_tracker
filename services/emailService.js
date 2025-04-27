// services/emailService.js
const pool = require('../db');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: parseInt(process.env.SMTP_PORT, 10) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendWeeklySummary() {
  // calculate the window: from exactly 7 days ago at 14:00 to now
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const until = new Date();

  // fetch purchases in that window, joined to pupil+form
  const { rows } = await pool.query(
    `SELECT f.form_name,
            p.first_name, p.last_name, pr.description, pu.merit_cost_at_time, pu.date
     FROM purchase pu
     JOIN pupils p ON pu.pupil_id = p.pupil_id
     JOIN form f    ON p.form_id = f.form_id
     JOIN prizes pr ON pu.prize_id = pr.prize_id
     WHERE pu.active = TRUE
       AND pu.date BETWEEN $1 AND $2
     ORDER BY f.form_name, p.last_name, pu.date`,
    [since, until]
  );

  if (rows.length === 0) {
    console.log('No purchases this week; skipping email.');
    return;
  }

  // group by form
  const byForm = rows.reduce((acc, r) => {
    acc[r.form_name] = acc[r.form_name] || [];
    acc[r.form_name].push(r);
    return acc;
  }, {});

  // build HTML
  let html = `<h2>Weekly Purchase Summary</h2>
              <p>Period: ${since.toLocaleString()} → ${until.toLocaleString()}</p>`;
  for (const form of Object.keys(byForm)) {
    html += `<h3>Form: ${form}</h3><ul>`;
    byForm[form].forEach(r => {
      html += `<li>${r.date.toLocaleDateString()} ${r.date.toLocaleTimeString()} — 
                 ${r.first_name} ${r.last_name} bought “${r.description}” for ${r.merit_cost_at_time} merits</li>`;
    });
    html += `</ul>`;
  }

  // send mail
  await transporter.sendMail({
    from: process.env.SUMMARY_EMAIL_FROM,
    to: process.env.SUMMARY_EMAIL_TO,
    subject: `Weekly Purchase Summary (${since.toDateString()} – ${until.toDateString()})`,
    html
  });

  console.log('Weekly summary email sent.');
}

module.exports = { sendWeeklySummary };

