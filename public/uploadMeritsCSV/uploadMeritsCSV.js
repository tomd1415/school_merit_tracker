// public/uploadMeritsCSV/uploadMeritsCSV.js
document.addEventListener('DOMContentLoaded', () => {
  const uploadForm = document.getElementById('uploadForm');
  const csvFileInput = document.getElementById('csvFile');
  const uploadMessage = document.getElementById('uploadMessage');
  const errorBox = document.getElementById('errorBox');
  const errorList = document.getElementById('errorList');

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    uploadMessage.textContent = '';
    errorBox.style.display = 'none';
    errorList.innerHTML = '';

    const file = csvFileInput.files[0];
    if (!file) {
      uploadMessage.textContent = 'Please select a CSV file.';
      return;
    }

    const formData = new FormData();
    formData.append('csvFile', file);

    try {
      const response = await fetch('/upload/csv/merits', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json(); 
      // e.g. { updatedCount: 3, missing: ["bob jones", "alice rogers"] }

      // Show success message:
      uploadMessage.style.color = 'green';
      uploadMessage.textContent = 
        `Upload complete. Updated: ${result.updatedCount}.`;

      // If we have missing pupils, display them:
      if (result.missing && result.missing.length > 0) {
        errorBox.style.display = 'block';
        result.missing.forEach(name => {
          const li = document.createElement('li');
          li.textContent = name;
          errorList.appendChild(li);
        });
      }

    } catch (err) {
      console.error(err);
      uploadMessage.style.color = 'red';
      uploadMessage.textContent = 'Error uploading or processing CSV.';
    }
  });
});

