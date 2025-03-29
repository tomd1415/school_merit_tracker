// public/pupils/pupils.js

// Global references
let inlineEditEnabled = false;
let formsData = []; // to store forms for editing

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
    hideModal(modal);
  });

  cancelEditBtn.addEventListener('click', () => {
    hideModal(modal);
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

      // Build the row cells with consistent styling
      row.innerHTML = `
        <td ${inlineEditEnabled ? 'class="editable"' : ''} data-field="first_name">${pupil.first_name}</td>
        <td ${inlineEditEnabled ? 'class="editable"' : ''} data-field="last_name">${pupil.last_name}</td>
        <td ${inlineEditEnabled ? 'class="editable"' : ''} data-field="form_name" data-formid="${pupil.form_id}">${pupil.form_name}</td>
        <td ${inlineEditEnabled ? 'class="editable"' : ''} data-field="merits">${pupil.merits}</td>
        <td class="remaining_merits">
          ${pupil.remaining_merits != null ? pupil.remaining_merits : 'N/A'}
        </td>
        <td>
          <button class="edit-btn" onclick="openEditModal(${pupil.pupil_id})">Edit</button>
          <button class="delete-btn" onclick="confirmDeletePupil(${pupil.pupil_id})">Delete</button>
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
    showModal(document.getElementById('editModal'));
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
        hideModal(document.getElementById('editModal'));
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

// Event listeners for Add Pupil modal
document.addEventListener('DOMContentLoaded', () => {
  const addPupilBtn = document.getElementById('addPupilBtn');
  const addPupilModal = document.getElementById('addPupilModal');
  const closeAddPupilModal = document.getElementById('closeAddPupilModal');
  const cancelAddPupilBtn = document.getElementById('cancelAddPupilBtn');
  const addFormBtn = document.getElementById('addFormBtn');
  const addFormModal = document.getElementById('addFormModal');
  const closeAddFormModal = document.getElementById('closeAddFormModal');
  const cancelAddFormBtn = document.getElementById('cancelAddFormBtn');
  const addPupilForm = document.getElementById('addPupilForm');
  const addFormFormEl = document.getElementById('addFormForm');

  addPupilBtn.addEventListener('click', () => {
    // Before showing the modal, populate the form dropdown
    populateAddPupilFormSelect();
    showModal(addPupilModal);
  });
  
  closeAddPupilModal.addEventListener('click', () => {
    hideModal(addPupilModal);
  });
  
  cancelAddPupilBtn.addEventListener('click', () => {
    hideModal(addPupilModal);
  });

  // For Add Form
  addFormBtn.addEventListener('click', () => {
    showModal(addFormModal);
  });
  
  closeAddFormModal.addEventListener('click', () => {
    hideModal(addFormModal);
  });
  
  cancelAddFormBtn.addEventListener('click', () => {
    hideModal(addFormModal);
  });

  // 3. SUBMIT Add Pupil form
  addPupilForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedbackEl = document.getElementById('addPupilFeedback');
    feedbackEl.textContent = '';

    const first_name = document.getElementById('addPupilFirstName').value.trim();
    const last_name = document.getElementById('addPupilLastName').value.trim();
    const form_id = document.getElementById('addPupilFormSelect').value;

    if (!first_name || !last_name || !form_id) {
      feedbackEl.textContent = 'Please fill out all required fields.';
      return;
    }

    // Send POST request to /pupils/add
    try {
      const res = await fetch('/pupils/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name, last_name, form_id })
      });
      const data = await res.json();
      if (!res.ok) {
        feedbackEl.textContent = data.error || 'Failed to add pupil.';
      } else {
        feedbackEl.style.color = 'green';
        feedbackEl.textContent = 'Pupil added successfully!';
        // Close modal after a short delay
        setTimeout(() => {
          hideModal(addPupilModal);
          // Reload pupils to show the new entry
          loadPupils(document.getElementById('formFilter').value);
        }, 800);
      }
    } catch (err) {
      console.error(err);
      feedbackEl.textContent = 'An error occurred.';
    }
  });

  // 4. SUBMIT Add Form form
  addFormFormEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedbackEl = document.getElementById('addFormFeedback');
    feedbackEl.textContent = '';

    const form_name = document.getElementById('addFormName').value.trim();
    const form_tutor = document.getElementById('addFormTutor').value.trim();
    const year_group = document.getElementById('addFormYearGroup').value.trim();

    if (!form_name) {
      feedbackEl.textContent = 'Form name is required.';
      return;
    }

    // Send POST request to /pupils/addForm
    try {
      const res = await fetch('/pupils/addForm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_name, form_tutor, year_group })
      });
      const data = await res.json();
      if (!res.ok) {
        feedbackEl.textContent = data.error || 'Failed to add form.';
      } else {
        feedbackEl.style.color = 'green';
        feedbackEl.textContent = 'Form added successfully!';
        // Close modal after a short delay
        setTimeout(async () => {
          hideModal(addFormModal);
          // Reload forms so new form appears in dropdowns
          await loadForms();
        }, 800);
      }
    } catch (err) {
      console.error(err);
      feedbackEl.textContent = 'An error occurred.';
    }
  });
});

// 5. POPULATE the "Add Pupil" form's dropdown with the existing forms
function populateAddPupilFormSelect() {
  const select = document.getElementById('addPupilFormSelect');
  select.innerHTML = '';
  // formsData is loaded by loadForms() on page load
  formsData.forEach(f => {
    const option = document.createElement('option');
    option.value = f.form_id;
    option.textContent = f.form_name;
    select.appendChild(option);
  });
}

