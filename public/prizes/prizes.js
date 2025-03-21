// public/prizes/prizes.js

window.addEventListener('DOMContentLoaded', async () => {
  loadPrizes();

  // Open Add Prize Modal
  document.getElementById('addPrizeBtn').addEventListener('click', () => {
    document.getElementById('addPrizeModal').style.display = 'block';
  });

  // Close Add Prize Modal
  document.getElementById('closeAddPrizeModal').addEventListener('click', () => {
    document.getElementById('addPrizeModal').style.display = 'none';
  });
  document.getElementById('cancelAddPrizeBtn').addEventListener('click', () => {
    document.getElementById('addPrizeModal').style.display = 'none';
  });

  // Add Prize Form Submission
  document.getElementById('addPrizeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const feedback = document.getElementById('addPrizeFeedback');
    feedback.textContent = '';

    const description = document.getElementById('addPrizeDescription').value.trim();
    const cost_merits = document.getElementById('addPrizeCostMerits').value;
    const cost_money = document.getElementById('addPrizeCostMoney').value;
    const imageFile = document.getElementById('addPrizeImage').files[0];

    if (!description || cost_merits === '' || cost_money === '' || !imageFile) {
      feedback.textContent = 'Please provide all required inputs.';
      return;
    }

    const formData = new FormData();
    formData.append('description', description);
    formData.append('cost_merits', cost_merits);
    formData.append('cost_money', cost_money);
    formData.append('image', imageFile);

    try {
      const response = await fetch('/prizes/add', {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        // Reload prizes list and close modal
        await loadPrizes();
        document.getElementById('addPrizeModal').style.display = 'none';
      } else {
        const result = await response.json();
        feedback.textContent = result.error || 'Error adding prize';
      }
    } catch (error) {
      console.error('Error adding prize:', error);
      feedback.textContent = 'Error adding prize';
    }
  });

  // Delegate click events for Edit buttons in the table
  document.querySelector('#prizeTable tbody').addEventListener('click', async (e) => {
    if (e.target.matches('button.edit-btn')) {
      const prizeId = e.target.getAttribute('data-id');
      openEditPrizeModal(prizeId);
    }
    if (e.target.matches('button.delete-btn')) {
      const prizeId = e.target.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this prize?')) {
        await deletePrize(prizeId);
        await loadPrizes();
      }
    }
  });

  // Close Edit Prize Modal
  document.getElementById('closeEditPrizeModal').addEventListener('click', () => {
    document.getElementById('editPrizeModal').style.display = 'none';
  });
  document.getElementById('cancelEditPrizeBtn').addEventListener('click', () => {
    document.getElementById('editPrizeModal').style.display = 'none';
  });

  // Edit Prize Form Submission
  document.getElementById('editPrizeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const feedback = document.getElementById('editPrizeFeedback');
    feedback.textContent = '';

    const prizeId = document.getElementById('editPrizeId').value;
    const description = document.getElementById('editPrizeDescription').value.trim();
    const cost_merits = document.getElementById('editPrizeCostMerits').value;
    const cost_money = document.getElementById('editPrizeCostMoney').value;
    const imageFile = document.getElementById('editPrizeImage').files[0];

    const formData = new FormData();
    formData.append('description', description);
    formData.append('cost_merits', cost_merits);
    formData.append('cost_money', cost_money);
    // Append new image if provided
    if (imageFile) { 
      formData.append('image', imageFile);
    }
    
    try {
      const response = await fetch(`/prizes/edit/${prizeId}`, {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        await loadPrizes();
        document.getElementById('editPrizeModal').style.display = 'none';
      } else {
        const result = await response.json();
        feedback.textContent = result.error || 'Error updating prize';
      }
    } catch (error) {
      console.error('Error editing prize:', error);
      feedback.textContent = 'Error editing prize';
    }
  });
});

// Function to load prizes and populate the table
async function loadPrizes() {
  try {
    const response = await fetch('/prizes/all/json');
    if (!response.ok) throw new Error('Network error');
    const prizes = await response.json();
    const tbody = document.querySelector('#prizeTable tbody');
    tbody.innerHTML = '';

    prizes.forEach(prize => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${prize.prize_id}</td>
        <td>${prize.description}</td>
        <td>${prize.cost_merits}</td>
        <td>${prize.cost_money}</td>
        <td><img src="${prize.image_path}" alt="Prize Image" style="width:50px;height:auto;"></td>
        <td>${prize.active}</td>
        <td>
          <button class="edit-btn" data-id="${prize.prize_id}">Edit</button>
          <button class="delete-btn" data-id="${prize.prize_id}">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading prizes:', error);
  }
}

// Function to open the Edit Prize modal and load prize details
async function openEditPrizeModal(prizeId) {
  try {
    const res = await fetch(`/prizes/${prizeId}/json`);
    if (!res.ok) throw new Error('Failed to fetch prize details');
    const prize = await res.json();

    document.getElementById('editPrizeId').value = prize.prize_id;
    document.getElementById('editPrizeDescription').value = prize.description;
    document.getElementById('editPrizeCostMerits').value = prize.cost_merits;
    document.getElementById('editPrizeCostMoney').value = prize.cost_money;
    document.getElementById('currentPrizeImage').innerHTML =
      `<img src="${prize.image_path}" alt="Current Prize Image" style="width:100px;height:auto;">`;

    document.getElementById('editPrizeModal').style.display = 'block';
  } catch (error) {
    console.error('Error fetching prize for editing:', error);
  }
}

// Function to delete prize
async function deletePrize(prizeId) {
  try {
    await fetch(`/prizes/delete/${prizeId}`, { method: 'GET' });
  } catch (error) {
    console.error('Error deleting prize:', error);
  }
}

