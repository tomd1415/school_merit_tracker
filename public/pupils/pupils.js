// public/pupils/pupils.js

// Global references
let inlineEditEnabled = false;
let formsData = []; // to store forms for editing

window.addEventListener('DOMContentLoaded', async () => {
  // 1. Load forms for filter dropdown + edit form select
  await loadForms();

  // 2. Add event listener to the filter dropdown
  document.getElementById('formFilter').addEventListener('change', filterPupils);

  // 3. Inline Edit Toggle
  document.getElementById('inlineEditToggle').addEventListener('change', (e) => {
    inlineEditEnabled = e.target.checked;
    toggleInlineEdit(inlineEditEnabled);
  });

  // 4. Load all pupils (no form filter initially)
  await filterPupils();

  // Setup modal close/cancel
  const modal = document.getElementById('editModal');
  const closeBtn = modal.querySelector('.close-btn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  cancelEditBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Handle form submission in modal
  const editForm = document.getElementById('editPupilForm');
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitEditForm();
  });
});

// Load forms into filter dropdown + edit modal select
async function loadForms() {
  try {
    const res = await fetch('/pupils/getForms');
    if (!res.ok) throw new Error('Could not load forms');

    formsData = await res.json();

    // Populate the filter dropdown
    const filterSelect = document.getElementById('formFilter');
    // Clear existing options except the first "All"
    while (filterSelect.options.length > 1) {
      filterSelect.remove(1);
    }

    formsData.forEach((frm) => {
      const option = document.createElement('option');
      option.value = frm.form_id;
      option.text = frm.form_name;
      filterSelect.appendChild(option);
    });
  } catch (err) {
    console.error(err);
  }
}

// Filter pupils by selected form
async function filterPupils() {
  const formFilterValue = document.getElementById('formFilter').value;
  await loadPupils(formFilterValue);
}

// Load pupils (with optional form_id)
async function loadPupils(form_id = '') {
  try {
    let url = '/pupils/all/json';
    if (form_id) {
      url += `?form_id=${form_id}`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');

    const pupils = await response.json();
    const tbody = document.querySelector('#pupilTable tbody');
    tbody.innerHTML = ''; // clear old rows

    pupils.forEach((pupil) => {
      const row = document.createElement('tr');
      
      // Store pupil_id in a data attribute (no longer as a visible column)
      row.setAttribute('data-pupil-id', pupil.pupil_id);

      // Build the row cells
      row.innerHTML = `
        <td class="${inlineEditEnabled ? 'editable' : ''}" data-field="first_name">${pupil.first_name}</td>
        <td class="${inlineEditEnabled ? 'editable' : ''}" data-field="last_name">${pupil.last_name}</td>
        <td class="${inlineEditEnabled ? 'editable' : ''}" data-field="form_name" data-formid="${pupil.form_id}">${pupil.form_name}</td>
        <td class="${inlineEditEnabled ? 'editable' : ''}" data-field="merits">${pupil.merits}</td>
        <!-- NEW: remaining_merits column (always read-only, no "editable" class) -->
        <td class="remaining_merits">
          ${pupil.remaining_merits != null ? pupil.remaining_merits : 'N/A'}
        </td>
        <td>
          <button onclick="openEditModal(${pupil.pupil_id})">Edit</button>
          <button onclick="confirmDeletePupil(${pupil.pupil_id})">Delete</button>
        </td>
      `;

      tbody.appendChild(row);
    });

    // If inline editing is on, apply it to the newly created rows
    if (inlineEditEnabled) {
      enableInlineEditing();
    }
  } catch (error) {
    console.error('Error loading pupils:', error);
  }
}

// Enable inline editing for relevant cells
function enableInlineEditing() {
  const editableCells = document.querySelectorAll('td.editable');
  editableCells.forEach(cell => {
    cell.contentEditable = 'true';
    cell.addEventListener('blur', handleInlineEditBlur);
  });
}

// Toggle inline editing on/off
function toggleInlineEdit(enabled) {
  const editableCells = document.querySelectorAll('td[data-field]');
  if (enabled) {
    editableCells.forEach(cell => {
      cell.classList.add('editable');
      cell.contentEditable = 'true';
      cell.addEventListener('blur', handleInlineEditBlur);
    });
  } else {
    editableCells.forEach(cell => {
      cell.classList.remove('editable');
      cell.contentEditable = 'false';
      cell.removeEventListener('blur', handleInlineEditBlur);
    });
  }
}

// Handle blur event in inline editing
// Modify handleInlineEditBlur to get pupil_id from row.dataset
async function handleInlineEditBlur(e) {
  const cell = e.target;
  const newValue = cell.textContent.trim();
  const field = cell.getAttribute('data-field');

  // Retrieve the row and pupil_id from the data attribute
  const row = cell.closest('tr');
  const pupil_id = row.dataset.pupilId;

  // Basic validation for 'merits'
  if (field === 'merits' && isNaN(newValue)) {
    alert('Merits must be a valid number');
    // revert changes by reloading
    await loadPupils(document.getElementById('formFilter').value);
    return;
  }

  // If field is 'form_name', match it to a form_id
  let form_id = null;
  if (field === 'form_name') {
    const match = formsData.find(f => f.form_name === newValue);
    if (!match) {
      alert('Unknown form name. Please use the modal for a bigger edit or select from known forms.');
      await loadPupils(document.getElementById('formFilter').value);
      return;
    }
    form_id = match.form_id;
  }

  // Gather current row data from other cells
  // Notice the changed cell indexes:
  //  0 -> first_name
  //  1 -> last_name
  //  2 -> form_name
  //  3 -> merits
  //  4 -> remaining_merits (NOT editable)
  //
  // So for reading, you can query them by data-field:
  function getFieldValue(fieldName) {
    const td = row.querySelector(`td[data-field="${fieldName}"]`);
    return td ? td.textContent.trim() : '';
  }

  const first_name = getFieldValue('first_name');
  const last_name = getFieldValue('last_name');
  const currentFormId = row.querySelector('td[data-field="form_name"]')?.getAttribute('data-formid') || '';
  const merits = getFieldValue('merits');

  const updatedData = {
    first_name: (field === 'first_name') ? newValue : first_name,
    last_name: (field === 'last_name') ? newValue : last_name,
    form_id: form_id || currentFormId,
    merits: (field === 'merits') ? newValue : merits
  };

  await updatePupil(pupil_id, updatedData);
}

// POST the update to /pupils/edit/:id
async function updatePupil(pupil_id, data) {
  try {
    const response = await fetch(`/pupils/edit/${pupil_id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    const result = await response.json();

    if (!response.ok) {
      alert(result.error || 'Error updating pupil');
    } else {
      // Reload table data to show changes
      await loadPupils(document.getElementById('formFilter').value);
    }
  } catch (err) {
    console.error('Update Pupil Error:', err);
  }
}

// Open the edit modal with existing data
async function openEditModal(pupil_id) {
  try {
    // Fetch single pupil data
    const res = await fetch(`/pupils/${pupil_id}/json`);
    if (!res.ok) throw new Error('Unable to fetch pupil details');

    const pupil = await res.json();

    // Populate form fields
    document.getElementById('editPupilId').value = pupil.pupil_id;
    document.getElementById('editFirstName').value = pupil.first_name;
    document.getElementById('editLastName').value = pupil.last_name;
    document.getElementById('editMerits').value = pupil.merits;

    // Populate form select
    const editFormSelect = document.getElementById('editFormSelect');
    editFormSelect.innerHTML = '';
    formsData.forEach(f => {
      const option = document.createElement('option');
      option.value = f.form_id;
      option.textContent = f.form_name;
      if (f.form_id === pupil.form_id) {
        option.selected = true;
      }
      editFormSelect.appendChild(option);
    });

    // Show the modal
    document.getElementById('editModal').style.display = 'block';
  } catch (err) {
    console.error(err);
  }
}

// Submit the edit form in modal
async function submitEditForm() {
  const modalFeedback = document.getElementById('editModalFeedback');
  modalFeedback.textContent = '';

  const pupil_id = document.getElementById('editPupilId').value;
  const first_name = document.getElementById('editFirstName').value.trim();
  const last_name = document.getElementById('editLastName').value.trim();
  const form_id = document.getElementById('editFormSelect').value;
  const meritsVal = document.getElementById('editMerits').value;
  const merits = parseInt(meritsVal, 10);

  // Front-end validation
  if (!first_name || !last_name || !form_id || isNaN(merits) || merits < 0) {
    modalFeedback.style.color = 'red';
    modalFeedback.textContent = 'Please provide valid inputs.';
    return;
  }

  const data = { first_name, last_name, form_id, merits };

  try {
    const response = await fetch(`/pupils/edit/${pupil_id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    const result = await response.json();

    if (!response.ok) {
      modalFeedback.style.color = 'red';
      modalFeedback.textContent = result.error || 'Error updating pupil.';
    } else {
      modalFeedback.style.color = 'green';
      modalFeedback.textContent = 'Pupil updated successfully.';
      // Close modal after a short delay
      setTimeout(() => {
        document.getElementById('editModal').style.display = 'none';
        loadPupils(document.getElementById('formFilter').value);
      }, 800);
    }
  } catch (err) {
    console.error('submitEditForm error:', err);
    modalFeedback.style.color = 'red';
    modalFeedback.textContent = 'An error occurred.';
  }
}

// Confirm delete pupil
function confirmDeletePupil(pupil_id) {
  if (confirm('Are you sure you want to delete this pupil?')) {
    deletePupil(pupil_id);
  }
}

// Delete pupil (set active = false)
async function deletePupil(pupil_id) {
  try {
    const res = await fetch(`/pupils/delete/${pupil_id}`);
    if (!res.ok) {
      const errData = await res.json();
      alert(errData.error || 'Failed to delete pupil.');
      return;
    }
    // Successfully "deleted"
    await loadPupils(document.getElementById('formFilter').value);
  } catch (err) {
    console.error('Error deleting pupil:', err);
  }
}

