// public/prizes/prizes.js

let inlineEditEnabled = false;      // Track whether inline editing is on/off
let allPrizes = [];                // We'll store the fetched prizes here

function isoDayName(iso) {
  const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return names[(iso - 1 + 7) % 7] || 'Monday';
}

function formatCycleWeeks(weeks) {
  const safeWeeks = Math.max(0, parseInt(weeks, 10) || 0);
  return safeWeeks === 0 ? 'Weekly' : `${safeWeeks} wk${safeWeeks === 1 ? '' : 's'}`;
}

function formatCycleWeeksVerbose(weeks) {
  const safeWeeks = Math.max(0, parseInt(weeks, 10) || 0);
  return safeWeeks === 0 ? 'Every week' : `Every ${safeWeeks} week${safeWeeks === 1 ? '' : 's'}`;
}

function initCycleToggle(toggleId, fieldsId) {
  const toggle = document.getElementById(toggleId);
  const fields = document.getElementById(fieldsId);
  if (!toggle || !fields) return;

  const sync = () => {
    fields.style.display = toggle.checked ? 'grid' : 'none';
  };

  toggle.addEventListener('change', sync);
  sync();
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

  // 10) Cycle toggle visibility
  initCycleToggle('addPrizeCycleLimited', 'addPrizeCycleFields');
  initCycleToggle('editPrizeCycleLimited', 'editPrizeCycleFields');

  // 11) Subtle scroll hint on table
  initTableScrollHint();
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
      row.setAttribute('data-cycle-limited', prize.is_cycle_limited);

      const spacesPerCycle = prize.spaces_per_cycle ?? 0;
      const cycleWeeksValue = prize.cycle_weeks ?? 0;
      const resetDayValue = prize.reset_day_iso ?? 1;
      const stockModeLabel = prize.is_cycle_limited ? 'Cycle' : 'Total';
      const totalStockDisplay = prize.is_cycle_limited ? '—' : prize.total_stocked_ever;
      const spoiledDisplay = prize.is_cycle_limited ? '—' : prize.stock_adjustment;
      const spacesDisplay = prize.is_cycle_limited ? spacesPerCycle : '—';
      const cycleWeeksDisplay = prize.is_cycle_limited ? formatCycleWeeks(cycleWeeksValue) : '—';
      const resetDayDisplay = prize.is_cycle_limited ? isoDayName(resetDayValue) : '—';
      const stockNumber = Math.max(prize.current_stock ?? 0, 0);
      const currentStockDisplay = prize.is_cycle_limited
        ? `${stockNumber} / ${spacesPerCycle} left`
        : `${stockNumber}`;
      const addStockButton = prize.is_cycle_limited
        ? ''
        : `<button class="add-stock-btn" data-id="${prize.prize_id}">Add Stock</button>`;

      // Build columns (ensure your prizes.html has matching <th>!)
      // We'll store data in 'data-field' attributes for inline editing
      row.innerHTML = `
        <!-- <td>${prize.prize_id}</td> -->
        <td data-field="description">${prize.description}</td>
        <td data-field="cost_merits">${prize.cost_merits}</td>
        <td data-field="cost_money">${prize.cost_money}</td>
        <td data-field="is_cycle_limited" data-raw="${prize.is_cycle_limited}">${stockModeLabel}</td>
        <td data-field="total_stocked_ever" data-raw="${prize.total_stocked_ever}">${totalStockDisplay}</td>
        <td data-field="stock_adjustment" data-raw="${prize.stock_adjustment}">${spoiledDisplay}</td>
        <td data-field="spaces_per_cycle" data-raw="${spacesPerCycle}">${spacesDisplay}</td>
        <td data-field="cycle_weeks" data-raw="${cycleWeeksValue}">${cycleWeeksDisplay}</td>
        <td data-field="reset_day_iso" data-raw="${resetDayValue}">${resetDayDisplay}</td>
        <td class="current_stock">${currentStockDisplay}</td>
        <td data-field="image_path">
          <img src="${prize.image_path}" alt="Prize Image" style="width:50px;height:auto;">
        </td>
        <td data-field="active">${prize.active}</td>
        <td class="actions-cell">
          ${addStockButton}
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
    initTableScrollHint();
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
    const isCycleLimited = row.getAttribute('data-cycle-limited') === 'true';
    const editableCells = row.querySelectorAll('[data-field]');
    editableCells.forEach(cell => {
      if (inlineEditEnabled) {
        // Make it contentEditable (except image changes might need special handling)
        cell.classList.add('editable');

        const fieldName = cell.getAttribute('data-field');
        if (fieldName === 'is_cycle_limited') {
          cell.contentEditable = false;
          renderCycleToggle(cell, row);
          return;
        }

        if (fieldName === 'cycle_weeks') {
          if (!isCycleLimited) {
            cell.textContent = '—';
            cell.contentEditable = false;
            return;
          }
          cell.contentEditable = false;
          renderCycleWeeksSelect(cell, row);
          return;
        }

        if (fieldName === 'reset_day_iso') {
          if (!isCycleLimited) {
            cell.textContent = '—';
            cell.contentEditable = false;
            return;
          }
          cell.contentEditable = false;
          renderResetDaySelect(cell, row);
          return;
        }

        if (fieldName === 'spaces_per_cycle') {
          if (!isCycleLimited) {
            cell.textContent = '—';
            cell.contentEditable = false;
            return;
          }
          const raw = cell.getAttribute('data-raw');
          if (raw !== null) {
            cell.textContent = raw;
          }
        }

        if (fieldName === 'total_stocked_ever' && isCycleLimited) {
          cell.contentEditable = false;
          return;
        }
        
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
          if (isCycleLimited) {
            cell.contentEditable = false;
            return;
          }
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

        const fieldName = cell.getAttribute('data-field');
        if (fieldName === 'cycle_weeks') {
          cell.textContent = isCycleLimited ? formatCycleWeeks(cell.getAttribute('data-raw')) : '—';
        } else if (fieldName === 'spaces_per_cycle') {
          cell.textContent = isCycleLimited ? (cell.getAttribute('data-raw') ?? cell.textContent) : '—';
        } else if (fieldName === 'reset_day_iso') {
          cell.textContent = isCycleLimited ? isoDayName(cell.getAttribute('data-raw')) : '—';
        } else if (fieldName === 'is_cycle_limited') {
          cell.textContent = isCycleLimited ? 'Cycle' : 'Total';
        } else if (fieldName === 'total_stocked_ever' && isCycleLimited) {
          cell.textContent = '—';
        } else if (fieldName === 'stock_adjustment' && isCycleLimited) {
          cell.textContent = '—';
        }
        
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
  const parsedValue = parseFieldValue(field, newValue);
  await updatePrizeField(prizeId, field, parsedValue);
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
  const is_cycle_limited = document.getElementById('addPrizeCycleLimited').checked;
  const spaces_per_cycle = document.getElementById('addPrizeSpacesPerCycle').value;
  const cycle_weeks = document.getElementById('addPrizeCycleWeeks').value;
  const reset_day_iso = document.getElementById('addPrizeResetDay').value;
  const imageFile = document.getElementById('addPrizeImage').files[0];

  if (!description || cost_merits === '' || cost_money === '' || !imageFile) {
    feedback.textContent = 'Please provide all required inputs.';
    return;
  }

  if (is_cycle_limited) {
    const parsedSpaces = parseInt(spaces_per_cycle, 10);
    if (isNaN(parsedSpaces) || parsedSpaces < 1) {
      feedback.textContent = 'Please set Spaces per cycle to at least 1.';
      return;
    }
  }

  const clampedCycleWeeks = Math.min(52, Math.max(0, parseInt(cycle_weeks, 10) || 0));
  const clampedResetDay = Math.min(7, Math.max(1, parseInt(reset_day_iso, 10) || 1));

  const formData = new FormData();
  formData.append('description', description);
  formData.append('cost_merits', cost_merits);
  formData.append('cost_money', cost_money);
  formData.append('is_cycle_limited', is_cycle_limited);
  formData.append('spaces_per_cycle', spaces_per_cycle || 0);
  formData.append('cycle_weeks', clampedCycleWeeks);
  formData.append('reset_day_iso', clampedResetDay);
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
    document.getElementById('editPrizeCycleLimited').checked = !!prize.is_cycle_limited;
    document.getElementById('editPrizeSpacesPerCycle').value = prize.spaces_per_cycle ?? 0;
    document.getElementById('editPrizeCycleWeeks').value = prize.cycle_weeks ?? 0;
    document.getElementById('editPrizeResetDay').value = prize.reset_day_iso ?? 1;
    document.getElementById('editPrizeCycleLimited').dispatchEvent(new Event('change'));
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
  const is_cycle_limited = document.getElementById('editPrizeCycleLimited').checked;
  const spaces_per_cycle = document.getElementById('editPrizeSpacesPerCycle').value;
  const cycle_weeks = document.getElementById('editPrizeCycleWeeks').value;
  const reset_day_iso = document.getElementById('editPrizeResetDay').value;
  const imageFile = document.getElementById('editPrizeImage').files[0];

  if (is_cycle_limited) {
    const parsedSpaces = parseInt(spaces_per_cycle, 10);
    if (isNaN(parsedSpaces) || parsedSpaces < 1) {
      feedback.textContent = 'Please set Spaces per cycle to at least 1.';
      return;
    }
  }

  const clampedCycleWeeks = Math.min(52, Math.max(0, parseInt(cycle_weeks, 10) || 0));
  const clampedResetDay = Math.min(7, Math.max(1, parseInt(reset_day_iso, 10) || 1));

  const formData = new FormData();
  formData.append('description', description);
  formData.append('cost_merits', cost_merits);
  formData.append('cost_money', cost_money);
  formData.append('is_cycle_limited', is_cycle_limited);
  formData.append('spaces_per_cycle', spaces_per_cycle || 0);
  formData.append('cycle_weeks', clampedCycleWeeks);
  formData.append('reset_day_iso', clampedResetDay);

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
  if (prize && prize.is_cycle_limited) {
    alert('This prize uses cycle-based spaces. Adjust "Spaces per cycle" instead.');
    return;
  }
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

function parseFieldValue(field, rawValue) {
  if (['cost_merits', 'cost_money', 'total_stocked_ever', 'stock_adjustment', 'spaces_per_cycle', 'cycle_weeks', 'reset_day_iso'].includes(field)) {
    return parseInt(rawValue, 10) || 0;
  }
  if (field === 'active' || field === 'is_cycle_limited') {
    return (String(rawValue).toLowerCase() === 'true' || rawValue === true);
  }
  return rawValue;
}

async function updatePrizeField(prizeId, field, value) {
  const payload = { [field]: value };
  try {
    const resp = await fetch(`/prizes/edit/${prizeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      console.error('Update error:', errData.error || 'Unknown error');
      alert('Error updating field: ' + (errData.error || 'Unknown'));
      return;
    }
    await loadPrizes();
  } catch (err) {
    console.error('Inline update failed:', err);
    alert('Error updating field.');
  }
}

async function updateStockMode(prizeId, isCycle) {
  try {
    const resp = await fetch(`/prizes/mode/${prizeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ is_cycle_limited: isCycle })
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      console.error('Stock mode update error:', errData.error || 'Unknown error');
      alert('Error updating stock mode: ' + (errData.error || 'Unknown'));
      return;
    }
    await loadPrizes();
  } catch (err) {
    console.error('Stock mode request failed:', err);
    alert('Error updating stock mode.');
  }
}

function renderCycleToggle(cell, row) {
  const prizeId = row.getAttribute('data-prize-id');
  const isCycle = row.getAttribute('data-cycle-limited') === 'true';
  cell.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'toggle-pill';

  const totalBtn = document.createElement('button');
  totalBtn.type = 'button';
  totalBtn.textContent = 'Total';
  totalBtn.className = isCycle ? '' : 'active';

  const cycleBtn = document.createElement('button');
  cycleBtn.type = 'button';
  cycleBtn.textContent = 'Cycle';
  cycleBtn.className = isCycle ? 'active' : '';

  const setMode = async (mode) => {
    if ((mode === 'cycle' && isCycle) || (mode === 'total' && !isCycle)) return;
    await updateStockMode(prizeId, mode === 'cycle');
  };

  totalBtn.addEventListener('click', () => setMode('total'));
  cycleBtn.addEventListener('click', () => setMode('cycle'));

  wrapper.appendChild(totalBtn);
  wrapper.appendChild(cycleBtn);
  cell.appendChild(wrapper);
}

function renderCycleWeeksSelect(cell, row) {
  const prizeId = row.getAttribute('data-prize-id');
  const raw = cell.getAttribute('data-raw');
  const currentValue = parseInt(raw ?? '0', 10) || 0;
  const options = [0, 1, 2, 4, 6, 8, 12, 26, 52];

  cell.innerHTML = '';
  const select = document.createElement('select');
  select.className = 'inline-select';

  options.forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = formatCycleWeeksVerbose(val);
    select.appendChild(opt);
  });

  if (!options.includes(currentValue)) {
    const customOpt = document.createElement('option');
    customOpt.value = String(currentValue);
    customOpt.textContent = `${formatCycleWeeksVerbose(currentValue)} (custom)`;
    select.appendChild(customOpt);
  }

  const customOpt = document.createElement('option');
  customOpt.value = 'custom';
  customOpt.textContent = 'Custom…';
  select.appendChild(customOpt);

  select.value = String(options.includes(currentValue) ? currentValue : currentValue);

  select.addEventListener('change', async () => {
    let newVal = select.value;
    if (newVal === 'custom') {
      const input = prompt('Enter cycle length in weeks (0-52):', String(currentValue));
      if (input === null) {
        select.value = String(currentValue);
        return;
      }
      const parsed = parseInt(input, 10);
      if (isNaN(parsed) || parsed < 0 || parsed > 52) {
        alert('Please enter a number between 0 and 52.');
        select.value = String(currentValue);
        return;
      }
      newVal = parsed;
    }
    await updatePrizeField(prizeId, 'cycle_weeks', parseInt(newVal, 10) || 0);
  });

  cell.appendChild(select);
}

function renderResetDaySelect(cell, row) {
  const prizeId = row.getAttribute('data-prize-id');
  const raw = cell.getAttribute('data-raw');
  const currentValue = parseInt(raw ?? '1', 10) || 1;

  cell.innerHTML = '';
  const select = document.createElement('select');
  select.className = 'inline-select';

  const days = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 7, label: 'Sunday' }
  ];

  days.forEach(day => {
    const opt = document.createElement('option');
    opt.value = day.value;
    opt.textContent = day.label;
    select.appendChild(opt);
  });

  select.value = String(currentValue);

  select.addEventListener('change', async () => {
    const newVal = parseInt(select.value, 10) || 1;
    await updatePrizeField(prizeId, 'reset_day_iso', newVal);
  });

  cell.appendChild(select);
}

function initTableScrollHint() {
  const container = document.querySelector('.table-container');
  if (!container) return;

  // Ensure an inner scroll area exists so paddles can sit outside without clipping
  let scrollArea = container.querySelector('.table-scroll-area');
  if (!scrollArea) {
    const table = container.querySelector('#prizeTable');
    if (!table) return;
    scrollArea = document.createElement('div');
    scrollArea.className = 'table-scroll-area';
    table.parentNode.insertBefore(scrollArea, table);
    scrollArea.appendChild(table);
  }

  let leftPad = container.querySelector('.scroll-paddle.left');
  let rightPad = container.querySelector('.scroll-paddle.right');

  if (!leftPad) {
    leftPad = document.createElement('div');
    leftPad.className = 'scroll-paddle left';
    leftPad.innerHTML = `
      <div class="arrow-stack">
        <span>←</span>
        <span>←</span>
        <span>←</span>
        <span>←</span>
        <span>←</span>
      </div>
    `;
    container.appendChild(leftPad);
  }

  if (!rightPad) {
    rightPad = document.createElement('div');
    rightPad.className = 'scroll-paddle right';
    rightPad.innerHTML = `
      <div class="arrow-stack">
        <span>→</span>
        <span>→</span>
        <span>→</span>
        <span>→</span>
        <span>→</span>
      </div>
    `;
    container.appendChild(rightPad);
  }

  const scrollStep = 200;

  const update = () => {
    const hasOverflow = scrollArea.scrollWidth > scrollArea.clientWidth + 2;
    if (!hasOverflow) {
      leftPad.classList.remove('visible');
      rightPad.classList.remove('visible');
      return;
    }
    const atStart = scrollArea.scrollLeft <= 2;
    const atEnd = scrollArea.scrollLeft >= (scrollArea.scrollWidth - scrollArea.clientWidth - 2);
    leftPad.classList.toggle('visible', !atStart);
    rightPad.classList.toggle('visible', !atEnd);
  };

  leftPad.onclick = () => {
    scrollArea.scrollBy({ left: -scrollStep, behavior: 'smooth' });
  };
  rightPad.onclick = () => {
    scrollArea.scrollBy({ left: scrollStep, behavior: 'smooth' });
  };

  if (!container.dataset.scrollHintInit) {
    scrollArea.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    container.dataset.scrollHintInit = 'true';
  }

  update();
}
