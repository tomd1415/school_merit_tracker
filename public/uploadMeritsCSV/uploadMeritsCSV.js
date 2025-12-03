// public/uploadMeritsCSV/uploadMeritsCSV.js

document.addEventListener('DOMContentLoaded', () => {
  const uploadForm = document.getElementById('uploadForm');
  const csvFileInput = document.getElementById('csvFile');
  const messageEl = document.getElementById('uploadMessage');
  const missingBox = document.getElementById('missingBox');
  const missingTableBody = document.getElementById('missingTableBody');
  const applyActionsBtn = document.getElementById('applyActionsBtn');
  const lowerBox = document.getElementById('lowerBox');
  const lowerList = document.getElementById('lowerList');
  const addMissingToggle = document.getElementById('addMissingToggle');
  const createFormsToggle = document.getElementById('createFormsToggle');
  const updateFormToggle = document.getElementById('updateFormToggle');

  let forms = [];
  let lastMissing = [];

  const setMessage = (text, type = '') => {
    messageEl.textContent = text;
    messageEl.className = `feedback-message${type ? ` ${type}` : ''}`;
  };

  const loadForms = async () => {
    try {
      const res = await fetch('/pupils/getForms');
      if (!res.ok) throw new Error('Failed to load forms');
      forms = await res.json();
    } catch (err) {
      console.error('Could not load forms for add-missing:', err);
      forms = [];
    }
  };

  const renderLowerKept = (lowerKept = []) => {
    lowerList.innerHTML = '';
    if (!lowerKept.length) {
      lowerBox.style.display = 'none';
      return;
    }
    lowerKept.forEach((name) => {
      const li = document.createElement('li');
      li.textContent = name;
      lowerList.appendChild(li);
    });
    lowerBox.style.display = 'block';
  };

  const renderMissing = (missing = []) => {
    missingTableBody.innerHTML = '';
    if (!missing.length) {
      missingBox.style.display = 'none';
      lastMissing = [];
      return;
    }

    missing.forEach((pupil) => {
      const tr = document.createElement('tr');
      tr.dataset.firstName = pupil.first_name;
      tr.dataset.lastName = pupil.last_name;
      tr.dataset.merits = pupil.merits;
      tr.dataset.formName = pupil.form_name || '';
      tr.dataset.yearGroup = pupil.year_group != null ? pupil.year_group : '';

      tr.innerHTML = `
        <td>${pupil.first_name} ${pupil.last_name}</td>
        <td>${pupil.merits}</td>
        <td>${pupil.form_name || '-'}</td>
        <td>${pupil.year_group != null ? pupil.year_group : '-'}</td>
        <td>${pupil.reason || '-'}</td>
        <td>
          <select class="missing-action">
            <option value="ignore-once">Ignore once</option>
            <option value="ignore-forever">Ignore forever</option>
            <option value="add">Add pupil</option>
          </select>
        </td>
        <td>
          <select class="form-select">
            <option value="">Select form</option>
            ${forms.map(f => `<option value="${f.form_id}">${f.form_name}</option>`).join('')}
          </select>
        </td>
      `;
      missingTableBody.appendChild(tr);
    });

    missingBox.style.display = 'block';
    lastMissing = missing;
  };

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMessage('Uploading...');
    renderMissing([]);
    renderLowerKept([]);

    const file = csvFileInput.files[0];
    if (!file) {
      setMessage('Please select a CSV file.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('addMissingPupils', addMissingToggle.checked ? 'true' : 'false');
    formData.append('createForms', createFormsToggle.checked ? 'true' : 'false');
    formData.append('updateFormFromCsv', updateFormToggle.checked ? 'true' : 'false');

    try {
      const response = await fetch('/upload/csv/merits', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        const parts = [];
        parts.push(result.message || 'Upload complete.');
        if (result.updatedCount != null) parts.push(`Updated ${result.updatedCount}`);
        if (result.addedPupils) parts.push(`Added ${result.addedPupils.length}`);
        if (result.createdForms) parts.push(`New forms ${result.createdForms.length}`);
        if (result.formUpdates != null) parts.push(`Form updates ${result.formUpdates}`);
        const successMessage = parts.join(' • ');
        setMessage(successMessage, 'success');
        csvFileInput.value = '';
        renderMissing(result.missingPupils || []);
        renderLowerKept(result.lowerKept || []);
      } else {
        setMessage(result.error || 'Upload failed. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setMessage('An error occurred during upload. Please try again.', 'error');
    }
  });

  applyActionsBtn.addEventListener('click', async () => {
    if (!lastMissing.length) {
      setMessage('No missing pupils to process.', 'error');
      return;
    }

    const rows = Array.from(missingTableBody.querySelectorAll('tr'));
    const toAdd = [];
    const toIgnore = [];
    let hasMissingForm = false;

    rows.forEach((row) => {
      const action = row.querySelector('.missing-action').value;
      const formId = row.querySelector('.form-select').value;
      const first_name = row.dataset.firstName;
      const last_name = row.dataset.lastName;
      const merits = row.dataset.merits;
      const form_name = row.dataset.formName;
      const year_group = row.dataset.yearGroup;

      if (action === 'add') {
        if (!formId) {
          row.classList.add('row-error');
          hasMissingForm = true;
          return;
        }
        row.classList.remove('row-error');
        toAdd.push({ first_name, last_name, merits, form_id: formId, form_name, year_group });
      } else if (action === 'ignore-forever') {
        toIgnore.push({ first_name, last_name });
      }
    });

    if (hasMissingForm) {
      setMessage('Choose a form for each pupil you are adding.', 'error');
      return;
    }

    try {
      if (toIgnore.length) {
        await fetch('/upload/csv/merits/ignore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pupils: toIgnore })
        });
      }

      for (const pupil of toAdd) {
        const res = await fetch('/upload/csv/merits/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pupil)
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || 'Failed to add pupil.');
        }
      }

      setMessage('Actions applied.', 'success');
      renderMissing([]);
      lastMissing = [];
    } catch (err) {
      console.error('Failed to apply actions:', err);
      setMessage(err.message || 'Failed to apply actions.', 'error');
    }
  });

  loadForms();
});
