// public/prizes/prizes.js

let inlineEditEnabled = false;      // Track whether inline editing is on/off
let allPrizes = [];                // We'll store the fetched prizes here

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
    showModal(document.getElementById('addPrizeModal'));
  });
  document.getElementById('closeAddPrizeModal').addEventListener('click', () => {
    hideModal(document.getElementById('addPrizeModal'));
  });
  document.getElementById('cancelAddPrizeBtn').addEventListener('click', () => {
    hideModal(document.getElementById('addPrizeModal'));
  });

  // 4) Handle "Add Prize" form submission
  document.getElementById('addPrizeForm').addEventListener('submit', addPrizeHandler);

  // 5) Setup the "Edit Prize" modal open/close
  document.getElementById('closeEditPrizeModal').addEventListener('click', () => {
    hideModal(document.getElementById('editPrizeModal'));
  });
  document.getElementById('cancelEditPrizeBtn').addEventListener('click', () => {
    hideModal(document.getElementById('editPrizeModal'));
  });

  // 6) Handle "Edit Prize" form submission
  document.getElementById('editPrizeForm').addEventListener('submit', editPrizeFormHandler);

  // 7) Delegate table clicks for "Edit" / "Delete" buttons
  document.querySelector('#prizeTable tbody').addEventListener('click', tableButtonHandler);
  
  // 8) Setup stock info modal
  document.getElementById('closeStockInfoModal').addEventListener('click', () => {
    hideModal(document.getElementById('stockInfoModal'));
  });
  document.getElementById('closeStockInfoButton').addEventListener('click', () => {
    hideModal(document.getElementById('stockInfoModal'));
  });
  
  // 9) Add help icon to the stock adjustment header
  addStockHelpIcon();
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
        <td class="actions-cell">
          <button class="add-stock-btn" data-id="${prize.prize_id}">Add Stock</button>
          <div class="action-stack">
            <button class="edit-btn" data-id="${prize.prize_id}">Edit</button>
            <button class="delete-btn" data-id="${prize.prize_id}">Delete</button>
          </div>
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
        } 
        // Special handling for stock_adjustment
        else if (cell.getAttribute('data-field') === 'stock_adjustment') {
          cell.contentEditable = false;
          
          // Create a special input UI for stock adjustment
          const currentValue = parseInt(cell.textContent.trim(), 10) || 0;
          
          // Replace the cell content with a more compact form for spoiled stock
          cell.innerHTML = `
            <div class="stock-adjustment-compact">
              <span class="current-value">${currentValue}</span>
              <input type="number" min="0" class="spoiled-input" placeholder="#" title="Enter number of spoiled/lost items">
              <button class="record-spoiled-btn">+</button>
              <div class="tooltip">
                <span class="tooltip-icon">ⓘ</span>
                <span class="tooltip-text">
                  Enter a positive number to record lost/spoiled items. 
                  The system will automatically subtract them from your stock.
                </span>
              </div>
            </div>
          `;
          
          // Add event listener to the button
          const recordBtn = cell.querySelector('.record-spoiled-btn');
          recordBtn.addEventListener('click', () => handleSpoiledStockRecord(row.getAttribute('data-prize-id'), cell));
        }
        else {
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
        
        // Reset stock adjustment cell to just show the value
        else if (cell.getAttribute('data-field') === 'stock_adjustment') {
          // Get the current adjustment value from the span if it exists
          let currentValue = cell.textContent.trim();
          if (cell.querySelector('.current-value')) {
            currentValue = cell.querySelector('.current-value').textContent.trim();
          }
          
          // Reset to just the value
          cell.innerHTML = currentValue;
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
  if (e.target.matches('button.add-stock-btn')) {
    const prizeId = e.target.getAttribute('data-id');
    await promptAddStock(prizeId);
    return;
  }
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
      hideModal(document.getElementById('addPrizeModal'));
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

    showModal(document.getElementById('editPrizeModal'));
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
      hideModal(document.getElementById('editPrizeModal'));
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

/**
 * Prompt the user for a quantity to add to stock and push update to the server.
 * Adds to total_stocked_ever so current_stock reflects the increase.
 */
async function promptAddStock(prizeId) {
  const prizeNumId = parseInt(prizeId, 10);
  const prize = allPrizes.find(p => p.prize_id === prizeNumId);
  const currentTotal = prize ? parseInt(prize.total_stocked_ever, 10) || 0 : 0;
  const prizeName = prize ? prize.description : 'this prize';

  const input = prompt(`Add stock to "${prizeName}". Enter number of items to add:`, '0');
  if (input === null) return; // user cancelled

  const qty = parseInt(input, 10);
  if (isNaN(qty) || qty <= 0) {
    alert('Please enter a positive whole number to add to stock.');
    return;
  }

  const newTotal = currentTotal + qty;

  try {
    const resp = await fetch(`/prizes/edit/${prizeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total_stocked_ever: newTotal })
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      alert(errData.error || 'Error adding stock');
      return;
    }

    await loadPrizes();
  } catch (err) {
    console.error('Error adding stock:', err);
    alert('Error adding stock. Please try again.');
  }
}

/**
 * Handle recording spoiled/lost stock
 */
async function handleSpoiledStockRecord(prizeId, cell) {
  const input = cell.querySelector('.spoiled-input');
  const spoiledCount = parseInt(input.value, 10);
  
  if (isNaN(spoiledCount) || spoiledCount < 0) {
    alert('Please enter a valid number of spoiled items (0 or positive number)');
    return;
  }
  
  try {
    // Show loading state
    const currentValueSpan = cell.querySelector('.current-value');
    if (currentValueSpan) {
      currentValueSpan.style.opacity = '0.5';
    }
    input.disabled = true;
    
    // Record the spoiled stock (sending a NEGATIVE number since spoiled items reduce stock)
    const resp = await fetch(`/prizes/edit/${prizeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        stock_adjustment: -spoiledCount // Negative number to reduce stock
      })
    });
    
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      console.error('Update error:', errData.error || 'Unknown error');
      alert('Error recording spoiled stock: ' + (errData.error || 'Unknown'));
      
      // Reset loading state
      if (currentValueSpan) {
        currentValueSpan.style.opacity = '1';
      }
      input.disabled = false;
    } else {
      // Clear the input
      input.value = '';
      // Re-load to show updated stock
      await loadPrizes();
    }
  } catch (err) {
    console.error('Failed to record spoiled stock:', err);
    alert('Failed to record spoiled stock');
    
    // Reset loading state
    const currentValueSpan = cell.querySelector('.current-value');
    if (currentValueSpan) {
      currentValueSpan.style.opacity = '1';
    }
    input.disabled = false;
  }
}

/**
 * Add a help icon to the stock adjustment header for more information
 */
function addStockHelpIcon() {
  // Find the stock adjustment column header (now "Lost/Spoiled Items")
  const stockHeader = Array.from(document.querySelectorAll('#prizeTable th')).find(
    th => th.textContent.trim() === 'Lost/Spoiled Items'
  );
  
  if (stockHeader) {
    // Create the help icon
    const helpIcon = document.createElement('span');
    helpIcon.innerHTML = ' <i class="help-icon">?</i>';
    helpIcon.title = 'Click for more information about stock management';
    helpIcon.style.cursor = 'pointer';
    
    // Append it to the header
    stockHeader.appendChild(helpIcon);
    
    // Add click event to show the info modal
    helpIcon.addEventListener('click', () => {
      showModal(document.getElementById('stockInfoModal'));
    });
  }
}
