// public/pinLogin/pinLogin.js
document.addEventListener('DOMContentLoaded', () => {
  const pinDisplay = document.getElementById('pinDisplay');
  const pinInput = document.getElementById('pinInput');
  const pinForm = document.getElementById('pinForm');

  let enteredDigits = [];

  // Update the display to show number of entered digits or placeholders
  function updateDisplay() {
    // For security: show bullet points or placeholders
    const masked = enteredDigits.map(() => '•').join('');
    // If you want exactly 6 placeholders always, do this:
    const placeholders = '••••••'.split('');
    for (let i = 0; i < enteredDigits.length; i++) {
      placeholders[i] = '•';
    }
    pinDisplay.textContent = placeholders.join('');
  }

  function addDigit(digit) {
    if (enteredDigits.length < 6) {
      enteredDigits.push(digit);
      updateDisplay();
    }
  }

  function removeDigit() {
    enteredDigits.pop();
    updateDisplay();
  }

  // Listen for digit button clicks
  document.querySelectorAll('.digit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const digit = btn.getAttribute('data-digit');
      addDigit(digit);
    });
  });

  // Backspace (Del) button
  document.getElementById('backspaceBtn').addEventListener('click', removeDigit);

  // Submit (OK) button
  document.getElementById('submitPinBtn').addEventListener('click', () => {
    // If we have 6 digits, submit
    if (enteredDigits.length === 6) {
      pinInput.value = enteredDigits.join('');
      pinForm.submit();
    } else {
      alert('Please enter 6 digits before submitting.');
    }
  });
});

