// public/pupils/pupils.js

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/pupils/all/json');
    if (!response.ok) throw new Error('Network response was not ok');

    const pupils = await response.json();
    const tbody = document.querySelector('#pupilTable tbody');

    pupils.forEach((pupil) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${pupil.pupil_id}</td>
        <td>${pupil.first_name} ${pupil.last_name}</td>
        <td>${pupil.form_name}</td>
        <td>${pupil.merits}</td>
        <td>
          <button onclick="window.location.href='/pupils/edit/${pupil.pupil_id}'">
            Edit
          </button>
          <button onclick="window.location.href='/pupils/delete/${pupil.pupil_id}'">
            Delete
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading pupils:', error);
  }
});

