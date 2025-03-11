// public/addPupil/addPupil.js

document.addEventListener('DOMContentLoaded', () => {
  const formSelect = document.getElementById('formSelect');
  const addForm = document.getElementById('addForm');
  const addFormMessage = document.getElementById('addFormMessage');

  // 1) Load existing active forms
  async function loadForms() {
    try {
      const response = await fetch('/pupils/getForms');
      if (!response.ok) throw new Error('Failed to fetch forms');
      const forms = await response.json();

      // Clear the <select> (keep placeholder)
      formSelect.innerHTML = '<option value="">-- Select a Form --</option>';

      // Populate with each form
      forms.forEach((f) => {
        const option = document.createElement('option');
        option.value = f.form_id;
        // You could display more info if you want (form_name + year_group, for example)
        option.textContent = `${f.form_name} (Tutor: ${f.form_tutor}, Year: ${f.year_group})`;
        formSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading forms:', error);
    }
  }

  // Load forms on page load
  loadForms();

  // 2) Handle "Add Form" submission (AJAX)
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Collect inputs
    const newFormName = document.getElementById('newFormName').value.trim();
    const newFormTutor = document.getElementById('newFormTutor').value.trim();
    const newYearGroup = document.getElementById('newYearGroup').value.trim();

    if (!newFormName || !newFormTutor || !newYearGroup) return;

    try {
      const response = await fetch('/pupils/addForm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_name: newFormName,
          form_tutor: newFormTutor,
          year_group: newYearGroup
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create form');
      }

      // Clear the fields, show success
      document.getElementById('newFormName').value = '';
      document.getElementById('newFormTutor').value = '';
      document.getElementById('newYearGroup').value = '';
      addFormMessage.style.color = 'green';
      addFormMessage.textContent = 'Form created successfully!';

      // Refresh the dropdown
      await loadForms();
    } catch (err) {
      console.error('Error adding form:', err);
      addFormMessage.style.color = 'red';
      addFormMessage.textContent = 'Error adding form.';
    }
  });
});

