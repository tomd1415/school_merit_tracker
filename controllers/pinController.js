// controllers/pinController.js

const path = require('path');

// Show the PIN entry page
exports.showPinPage = (req, res) => {
  res.redirect(`/?showLogin=true&target=${encodeURIComponent(req.query.target || '')}`);
};

// Check the PIN
exports.checkPin = (req, res) => {
  const { pin, redirect } = req.body;
  const targetUrl = redirect || '/';
  
  // Validate PIN is provided
  if (!pin) {
    return res.status(400).send('PIN is required');
  }
  
  // Get the PINs from environment variables
  const purchasePin = process.env.PURCHASE_PIN || '1234';
  const fullPin = process.env.FULL_PIN || '5678';
  
  // Check if PIN matches one of the valid PINs
  if (pin === purchasePin) {
    // Set purchase access for the session
    req.session.userRole = 'purchase';
    
    // Return a JSON response for API requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ 
        success: true, 
        role: 'purchase', 
        redirect: targetUrl 
      });
    }
    
    // Redirect to target URL or home
    return res.redirect(303, decodeURIComponent(targetUrl));
  } else if (pin === fullPin) {
    // Set full access for the session
    req.session.userRole = 'full';
    
    // Return a JSON response for API requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ 
        success: true, 
        role: 'full', 
        redirect: targetUrl 
      });
    }
    
    // Redirect to target URL or home
    return res.redirect(303, decodeURIComponent(targetUrl));
  } else {
    // Invalid PIN
    
    // Return a JSON response for API requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ 
        success: false, 
        message: 'Invalid PIN',
        redirect: `/?showLogin=true&loginError=true&target=${encodeURIComponent(targetUrl)}` 
      });
    }
    
    // Redirect back to home with error flag and preserve the target
    return res.redirect(303, `/?showLogin=true&loginError=true&target=${encodeURIComponent(targetUrl)}`);
  }
};

// Handle logout
exports.logout = (req, res) => {
  // Clear the session
  req.session.destroy(err => {    
    // Return a JSON response for API requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ success: true });
    }
    
    // Redirect to home
    res.redirect('/');
  });
};

