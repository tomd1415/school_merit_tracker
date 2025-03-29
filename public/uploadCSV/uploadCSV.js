// public/uploadCSV/uploadCSV.js

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

document.addEventListener('DOMContentLoaded', () => {
  const uploadForm = document.getElementById('uploadForm');
  const messageEl = document.getElementById('uploadMessage');

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageEl.textContent = 'Uploading...';
    messageEl.className = 'feedback-message';

    const formData = new FormData(uploadForm);
    try {
      const response = await fetch('/upload/csv/pupils', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (response.ok) {
        messageEl.textContent = result.message || 'Upload successful!';
        messageEl.className = 'feedback-message success';
        // Clear the file input
        document.getElementById('csvFile').value = '';
      } else {
        messageEl.textContent = result.error || 'Upload failed. Please try again.';
        messageEl.className = 'feedback-message error';
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      messageEl.textContent = 'An error occurred during upload. Please try again.';
      messageEl.className = 'feedback-message error';
    }
  });
});

