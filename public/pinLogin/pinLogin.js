// public/pinLogin/pinLogin.js

// Global modal functions
function showModal(modalElement) {
  modalElement.style.display = 'flex';
  setTimeout(() => {
    modalElement.classList.add('show');
  }, 10);
}

function hideModal(modalElement) {
  modalElement.classList.remove('show');
  setTimeout(() => {
    modalElement.style.display = 'none';
  }, 300);
}

// Get DOM elements
const pinDisplay = document.getElementById('pinDisplay');
const pinInput = document.getElementById('pinInput');
const pinForm = document.getElementById('pinForm');
const digitBtns = document.querySelectorAll('.digit-btn');
const backspaceBtn = document.getElementById('backspaceBtn');
const submitPinBtn = document.getElementById('submitPinBtn');

let currentPin = '';
const maxLength = 6;

// Add event listeners
digitBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (currentPin.length < maxLength) {
      const digit = btn.dataset.digit;
      currentPin += digit;
      updateDisplay();
    }
  });
});

backspaceBtn.addEventListener('click', () => {
  if (currentPin.length > 0) {
    currentPin = currentPin.slice(0, -1);
    updateDisplay();
  }
});

submitPinBtn.addEventListener('click', () => {
  if (currentPin.length === maxLength) {
    submitPin();
  }
});

// Handle keyboard input
document.addEventListener('keydown', (e) => {
  if (/^\d$/.test(e.key) && currentPin.length < maxLength) {
    currentPin += e.key;
    updateDisplay();
  } else if (e.key === 'Backspace' && currentPin.length > 0) {
    currentPin = currentPin.slice(0, -1);
    updateDisplay();
  } else if (e.key === 'Enter' && currentPin.length === maxLength) {
    submitPin();
  }
});

// Update the pin display with dots
function updateDisplay() {
  pinDisplay.textContent = '•'.repeat(currentPin.length);
}

// Submit the PIN to the server
function submitPin() {
  pinInput.value = currentPin;
  pinForm.submit();
}

