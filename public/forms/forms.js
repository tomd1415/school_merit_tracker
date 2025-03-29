// Global functions
async function openEditModal(formId) {
  try {
    const res = await fetch(`/forms/${formId}`);
    if (!res.ok) throw new Error('Failed to load form details');
    const form = await res.json();

    document.getElementById('editFormId').value = formId;
    document.getElementById('editFormName').value = form.form_name;
    document.getElementById('editFormTutor').value = form.form_tutor;
    document.getElementById('editYearGroup').value = form.year_group;

    showModal(document.getElementById('editModal'));
  } catch (err) {
    console.error('Error loading form details:', err);
    alert('Failed to load form details. Please try again.');
  }
}

async function deleteForm(formId) {
  if (!confirm('Are you sure you want to delete this form?')) return;

  try {
    const res = await fetch(`/forms/delete/${formId}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Failed to delete form');

    loadForms();
  } catch (err) {
    console.error('Error deleting form:', err);
    alert('Failed to delete form. Please try again.');
  }
}

// Global loadForms function
async function loadForms() {
  try {
    const res = await fetch('/forms/all');
    if (!res.ok) throw new Error('Failed to load forms');
    const forms = await res.json();
    
    const tbody = document.querySelector('#formTable tbody');
    tbody.innerHTML = '';
    
    forms.forEach(form => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-form-id="${form.form_id}" data-field="form_name">${form.form_name}</td>
        <td data-form-id="${form.form_id}" data-field="form_tutor">${form.form_tutor}</td>
        <td data-form-id="${form.form_id}" data-field="year_group">${form.year_group}</td>
        <td>
          <button class="edit-btn" onclick="openEditModal(${form.form_id})">Edit</button>
          <button class="delete-btn" onclick="deleteForm(${form.form_id})">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading forms:', err);
    alert('Failed to load forms. Please refresh the page.');
  }
}

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
  // UI Elements
  const formTable = document.getElementById('formTable');
  const addFormBtn = document.getElementById('addFormBtn');
  const inlineEditToggle = document.getElementById('inlineEditToggle');
  const editModal = document.getElementById('editModal');
  const addFormModal = document.getElementById('addFormModal');
  const editFormForm = document.getElementById('editFormForm');
  const addFormForm = document.getElementById('addFormForm');
  const closeBtns = document.querySelectorAll('.close-btn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const cancelAddFormBtn = document.getElementById('cancelAddFormBtn');

  // Load forms on page load
  loadForms();

  // Event Listeners
  addFormBtn.addEventListener('click', () => {
    showModal(addFormModal);
  });

  inlineEditToggle.addEventListener('change', () => {
    applyInlineEditing(inlineEditToggle.checked);
  });

  editFormForm.addEventListener('submit', handleEditForm);
  addFormForm.addEventListener('submit', handleAddForm);

  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      hideModal(editModal);
      hideModal(addFormModal);
    });
  });

  cancelEditBtn.addEventListener('click', () => {
    hideModal(editModal);
  });

  cancelAddFormBtn.addEventListener('click', () => {
    hideModal(addFormModal);
  });

  // Inline Editing
  function applyInlineEditing(enabled) {
    const editableCells = formTable.querySelectorAll('td[data-field]');
    editableCells.forEach(cell => {
      if (enabled) {
        cell.classList.add('editable');
        cell.addEventListener('click', handleCellClick);
      } else {
        cell.classList.remove('editable');
        cell.removeEventListener('click', handleCellClick);
      }
    });
  }

  async function handleCellClick(e) {
    const cell = e.target;
    const formId = cell.dataset.formId;
    const field = cell.dataset.field;
    const currentValue = cell.textContent.trim();

    const input = document.createElement('input');
    input.type = field === 'year_group' ? 'number' : 'text';
    input.value = currentValue;
    input.className = 'inline-edit-input';
    
    if (field === 'year_group') {
      input.min = '0';
      input.max = '14';
    }

    cell.textContent = '';
    cell.appendChild(input);
    input.focus();

    input.addEventListener('blur', async () => {
      const newValue = input.value.trim();
      if (newValue !== currentValue) {
        try {
          // Validate year_group if that's the field being edited
          if (field === 'year_group') {
            const yearGroup = parseInt(newValue);
            if (isNaN(yearGroup) || yearGroup < 0 || yearGroup > 14) {
              alert('Year group must be between 0 and 14');
              cell.textContent = currentValue;
              return;
            }
          }

          // Get all current values from the row
          const row = cell.closest('tr');
          const formNameCell = row.querySelector('[data-field="form_name"]');
          const formTutorCell = row.querySelector('[data-field="form_tutor"]');
          const yearGroupCell = row.querySelector('[data-field="year_group"]');

          if (!formNameCell || !formTutorCell || !yearGroupCell) {
            throw new Error('Could not find all required form fields in the row');
          }

          // Get the current values from the cells
          const formName = formNameCell.textContent.trim();
          const formTutor = formTutorCell.textContent.trim();
          const yearGroup = parseInt(yearGroupCell.textContent.trim());

          // Create update data with all required fields
          const updateData = {
            form_name: field === 'form_name' ? newValue : formName,
            form_tutor: field === 'form_tutor' ? newValue : formTutor,
            year_group: field === 'year_group' ? parseInt(newValue) : yearGroup
          };

          console.log('Current values:', {
            formName,
            formTutor,
            yearGroup
          });
          console.log('New value:', newValue);
          console.log('Field being edited:', field);
          console.log('Form ID:', formId);
          console.log('Update data:', JSON.stringify(updateData, null, 2));

          const res = await fetch(`/forms/update/${formId}`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(updateData)
          });

          const responseData = await res.json();
          console.log('Server response:', responseData);

          if (!res.ok) {
            throw new Error(responseData.error || 'Failed to update form');
          }
          
          // Update the cell with the new value
          cell.textContent = newValue;
        } catch (err) {
          console.error('Error updating form:', err);
          cell.textContent = currentValue;
          alert(err.message || 'Failed to update form. Please try again.');
        }
      } else {
        cell.textContent = currentValue;
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        cell.textContent = currentValue;
      }
    });
  }

  async function handleEditForm(e) {
    e.preventDefault();
    const formId = document.getElementById('editFormId').value;
    const formData = {
      form_name: document.getElementById('editFormName').value,
      form_tutor: document.getElementById('editFormTutor').value,
      year_group: parseInt(document.getElementById('editYearGroup').value)
    };

    try {
      const res = await fetch(`/forms/update/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to update form');

      hideModal(editModal);
      loadForms();
    } catch (err) {
      console.error('Error updating form:', err);
      document.getElementById('editModalFeedback').textContent = 'Failed to update form. Please try again.';
    }
  }

  // Add Form Modal
  async function handleAddForm(e) {
    e.preventDefault();
    const formData = {
      form_name: document.getElementById('addFormName').value,
      form_tutor: document.getElementById('addFormTutor').value,
      year_group: parseInt(document.getElementById('addYearGroup').value)
    };

    try {
      const res = await fetch('/forms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to create form');

      hideModal(addFormModal);
      addFormForm.reset();
      loadForms();
    } catch (err) {
      console.error('Error creating form:', err);
      document.getElementById('addFormFeedback').textContent = 'Failed to create form. Please try again.';
    }
  }

  // Handle clicks outside modals
  window.addEventListener('click', (e) => {
    if (e.target === editModal) {
      hideModal(editModal);
    } else if (e.target === addFormModal) {
      hideModal(addFormModal);
    }
  });
}); 