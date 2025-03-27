// public/prizes/prizes.js

let inlineEditEnabled = false;      // Track whether inline editing is on/off
let allPrizes = [];                // We'll store the fetched prizes here

window.addEventListener('DOMContentLoaded', () => {
  // 1) Setup the inline-edit toggle
  const inlineEditToggle = document.getElementById('inlineEditToggle');
  if (inlineEditToggle) {
    inlineEditToggle.addEventListener('change', () => {
      inlineEditEnabled = inlineEditToggle.checked;
      // Re-render or just enable/disable editing on existing rows
      applyInlineEditing();
    });
  }

  // 2) Load the initial prizes data
  loadPrizes();

  // 3) Setup the "Add Prize" modal open/close
  document.getElementById('addPrizeBtn').addEventListener('click', () => {
    document.getElementById('addPrizeModal').style.display = 'block';
  });
  document.getElementById('closeAddPrizeModal').addEventListener('click', () => {
    document.getElementById('addPrizeModal').style.display = 'none';
  });
  document.getElementById('cancelAddPrizeBtn').addEventListener('click', () => {
    document.getElementById('addPrizeModal').style.display = 'none';
  });

  // 4) Handle "Add Prize" form submission
  document.getElementById('addPrizeForm').addEventListener('submit', addPrizeHandler);

  // 5) Setup the "Edit Prize" modal open/close
  document.getElementById('closeEditPrizeModal').addEventListener('click', () => {
    document.getElementById('editPrizeModal').style.display = 'none';
  });
  document.getElementById('cancelEditPrizeBtn').addEventListener('click', () => {
    document.getElementById('editPrizeModal').style.display = 'none';
  });

  // 6) Handle "Edit Prize" form submission
  document.getElementById('editPrizeForm').addEventListener('submit', editPrizeFormHandler);

  // 7) Delegate table clicks for "Edit" / "Delete" buttons
  document.querySelector('#prizeTable tbody').addEventListener('click', tableButtonHandler);
});

/**
 * Load prizes from /prizes/all/json, store them, and build table rows.
 */
async function loadPrizes() {
  try {
    const response = await fetch('/prizes/all/json');
    if (!response.ok) throw new Error('Network error loading prizes');
    allPrizes = await response.json();

    const tbody = document.querySelector('#prizeTable tbody');
    tbody.innerHTML = '';

    allPrizes.forEach(prize => {
      // Create a row
      const row = document.createElement('tr');
      row.setAttribute('data-prize-id', prize.prize_id);

      // Build columns (ensure your prizes.html has matching <th>!)
      // We'll store data in 'data-field' attributes for inline editing
      row.innerHTML = `
        <!-- <td>${prize.prize_id}</td> -->
        <td data-field="description">${prize.description}</td>
        <td data-field="cost_merits">${prize.cost_merits}</td>
        <td data-field="cost_money">${prize.cost_money}</td>
        <td data-field="total_stocked_ever">${prize.total_stocked_ever}</td>
        <td data-field="stock_adjustment">${prize.stock_adjustment}</td>
        <td class="current_stock">${prize.current_stock ?? 0}</td>
        <td data-field="image_path">
          <img src="${prize.image_path}" alt="Prize Image" style="width:50px;height:auto;">
        </td>
        <td data-field="active">${prize.active}</td>
        <td>
          <button class="edit-btn" data-id="${prize.prize_id}">Edit</button>
          <button class="delete-btn" data-id="${prize.prize_id}">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    // Now apply or remove inline editing
    applyInlineEditing();
  } catch (err) {
    console.error('Error loading prizes:', err);
  }
}

/**
 * Apply or remove inline editing based on inlineEditEnabled.
 */
function applyInlineEditing() {
  const rows = document.querySelectorAll('#prizeTable tbody tr');
  rows.forEach(row => {
    const editableCells = row.querySelectorAll('[data-field]');
    editableCells.forEach(cell => {
      if (inlineEditEnabled) {
        // Make it contentEditable (except image changes might need special handling)
        cell.classList.add('editable');
        
        // For image cells, we'll set up drag-and-drop instead of contentEditable
        if (cell.getAttribute('data-field') === 'image_path') {
          cell.contentEditable = false;
          
          // Add visual cue that images can be replaced
          const img = cell.querySelector('img');
          if (img) {
            img.classList.add('droppable-image');
            
            // Add drag event listeners to the cell
            cell.addEventListener('dragover', handleImageDragOver);
            cell.addEventListener('dragleave', handleImageDragLeave);
            cell.addEventListener('drop', handleImageDrop);
            
            // Add a hint that images can be dropped here
            img.title = "Drag a new image here to replace";
          }
        } else {
          cell.contentEditable = true;
          cell.addEventListener('blur', handleInlineEditBlur);
        }
      } else {
        cell.classList.remove('editable');
        cell.contentEditable = false;
        cell.removeEventListener('blur', handleInlineEditBlur);
        
        // Remove drag-and-drop for images
        if (cell.getAttribute('data-field') === 'image_path') {
          const img = cell.querySelector('img');
          if (img) {
            img.classList.remove('droppable-image');
            cell.removeEventListener('dragover', handleImageDragOver);
            cell.removeEventListener('dragleave', handleImageDragLeave);
            cell.removeEventListener('drop', handleImageDrop);
            img.title = "";
          }
        }
      }
    });
  });
}

/**
 * Prevent default during dragover to allow drop
 */
function handleImageDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  this.classList.add('drag-over');
}

/**
 * Remove the drag-over class when leaving
 */
function handleImageDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  this.classList.remove('drag-over');
}

/**
 * Handle image drop - upload the file and update the prize
 */
async function handleImageDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  
  this.classList.remove('drag-over');
  
  // Get the prize ID from the row
  const row = this.closest('tr');
  const prizeId = row.getAttribute('data-prize-id');
  
  // Check if files were dropped
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const fileDropped = e.dataTransfer.files[0];
    
    // Validate it's an image
    if (!fileDropped.type.match('image.*')) {
      alert('Only image files are allowed!');
      return;
    }
    
    try {
      // Create FormData and append the file
      const formData = new FormData();
      formData.append('image', fileDropped);
      
      // Show loading state
      const img = this.querySelector('img');
      const originalSrc = img.src;
      img.style.opacity = '0.5';
      
      // Upload the image
      const response = await fetch(`/prizes/edit/${prizeId}`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        // Refresh the prizes to show the updated image
        await loadPrizes();
      } else {
        // Show error and revert the image
        const result = await response.json();
        alert(result.error || 'Error updating image');
        img.style.opacity = '1';
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image');
      
      // Revert the image state
      const img = this.querySelector('img');
      img.style.opacity = '1';
    }
  }
}

/**
 * On blur of an editable cell, send the new value to the server.
 */
async function handleInlineEditBlur(e) {
  const cell = e.target;
  const field = cell.getAttribute('data-field');
  const newValue = cell.textContent.trim();

  // Which prize row is this?
  const row = cell.closest('tr');
  const prizeId = row.getAttribute('data-prize-id');

  // Convert certain fields to integers or booleans
  let parsedValue = newValue;
  if (['cost_merits', 'cost_money', 'total_stocked_ever', 'stock_adjustment'].includes(field)) {
    parsedValue = parseInt(newValue, 10) || 0;
  } else if (field === 'active') {
    // If user typed "true" or "false"
    parsedValue = (newValue.toLowerCase() === 'true');
  }
  // For image_path or description, we'll just use the string

  // Prepare the payload (only the one field changed)
  const payload = { [field]: parsedValue };

  try {
    const resp = await fetch(`/prizes/edit/${prizeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      console.error('Update error:', errData.error || 'Unknown error');
      alert('Error updating field: ' + (errData.error || 'Unknown'));
      // Optionally revert cell if needed
      // loadPrizes();
    } else {
      // Re-load to show updated stock or display
      // (If you only changed "description", you might do partial update,
      // but if total_stocked_ever changes, current_stock might change too.)
      await loadPrizes();
    }
  } catch (err) {
    console.error('Inline edit request failed:', err);
  }
}

/**
 * Handle clicks on Edit/Delete buttons in the table body.
 */
async function tableButtonHandler(e) {
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
}

/**
 * Add Prize form submission (uses /prizes/add with a FormData to handle image).
 */
async function addPrizeHandler(e) {
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
}

/**
 * Open the "Edit Prize" modal (the existing approach).
 */
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

/**
 * Handle the "Edit Prize" modal form submission (image changes, etc.).
 */
async function editPrizeFormHandler(e) {
  e.preventDefault();
  const feedback = document.getElementById('editPrizeFeedback');
  feedback.textContent = '';

  // Find the prizeId from the modal or from a data attribute
  const prizeId = document.getElementById('editPrizeId').value;
  if (!prizeId) {
    feedback.textContent = 'Prize ID is missing. Please try again.';
    return;
  }

  const description = document.getElementById('editPrizeDescription').value.trim();
  const cost_merits = document.getElementById('editPrizeCostMerits').value;
  const cost_money = document.getElementById('editPrizeCostMoney').value;
  const imageFile = document.getElementById('editPrizeImage').files[0];

  const formData = new FormData();
  formData.append('description', description);
  formData.append('cost_merits', cost_merits);
  formData.append('cost_money', cost_money);

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
}

/**
 * Delete a prize.
 */
async function deletePrize(prizeId) {
  try {
    await fetch(`/prizes/delete/${prizeId}`, { method: 'GET' });
    // The calling code re-loads the table
  } catch (error) {
    console.error('Error deleting prize:', error);
  }
}

