// public/prizes/prizes.js

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/prizes/all/json');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const prizes = await response.json();
    const tbody = document.querySelector('#prizeTable tbody');

    prizes.forEach(prize => {
      const row = document.createElement('tr');

      row.innerHTML = `
        <td>${prize.prize_id}</td>
        <td>${prize.description}</td>
        <td>${prize.cost_merits}</td>
        <td>${prize.cost_money}</td>
        <td>${prize.image_path}</td>
        <td>${prize.active}</td>
        <td>
          <button onclick="window.location.href='/prizes/edit/${prize.prize_id}'">
            Edit
          </button>
          <button onclick="window.location.href='/prizes/delete/${prize.prize_id}'">
            Delete
          </button>
        </td>
      `;

      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading prizes:', error);
  }
});

