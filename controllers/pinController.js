// controllers/pinController.js

const path = require('path');

exports.showPinPage = (req, res) => {
  // Render the numeric PIN entry page
  res.sendFile(path.join(__dirname, '..', 'public', 'pinLogin', 'pinLogin.html'));
};

exports.checkPin = (req, res) => {
  const purchasePin = process.env.PURCHASE_PIN;
  const fullPin = process.env.FULL_PIN;
  const enteredPin = req.body.pin;

  if (!enteredPin) {
    return res.status(400).send('No PIN entered.');
  }

  if (enteredPin === purchasePin) {
    req.session.userRole = 'purchase';
    // Go directly to the purchase page, or redirect to home
    return res.redirect('/purchase');
  } else if (enteredPin === fullPin) {
    req.session.userRole = 'full';
    // Could redirect to a main dashboard or anywhere
    return res.redirect('/');
  } else {
    // Invalid
    return res.send(`
      <h1>Incorrect PIN</h1>
      <p><a href="/enter-pin">Try again</a></p>
    `);
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    // Wipe out the session and redirect
    res.redirect('/enter-pin');
  });
};

