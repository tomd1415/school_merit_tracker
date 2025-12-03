// public/uploadMeritsCSV/uploadMeritsCSV.js

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
  const csvFileInput = document.getElementById('csvFile');
  const messageEl = document.getElementById('uploadMessage');
  const errorBox = document.getElementById('errorBox');
  const errorList = document.getElementById('errorList');

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageEl.textContent = 'Uploading...';
    messageEl.className = 'feedback-message';
    errorBox.style.display = 'none';
    errorList.innerHTML = '';

    const file = csvFileInput.files[0];
    if (!file) {
      messageEl.textContent = 'Please select a CSV file.';
      return;
    }

    const formData = new FormData();
    formData.append('csvFile', file);

    try {
      const response = await fetch('/upload/csv/merits', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        const successMessage = result.message || `Upload successful! Updated ${result.updatedCount ?? 0} pupil(s).`;
        messageEl.textContent = successMessage;
        messageEl.className = 'feedback-message success';
        // Clear the file input
        document.getElementById('csvFile').value = '';
        
        // Show not found pupils if any
        if (Array.isArray(result.notFoundPupils) && result.notFoundPupils.length > 0) {
          errorList.innerHTML = '';
          result.notFoundPupils.forEach(pupil => {
            const li = document.createElement('li');
            li.textContent = pupil;
            errorList.appendChild(li);
          });
          errorBox.style.display = 'block';
        }
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
