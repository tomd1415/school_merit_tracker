// public/purchase/purchase.js

let selectedPrizeId = null;
let selectedPrizeDescription = '';
let currentPurchaseId = null;
let currentPupilId = null; // Store the pupil ID for the current purchase
let currentPupilName = null; // Store the pupil name for the current purchase
let currentPrizeMerits = null; // Store the merit cost of the current purchase
let recentPupils = []; // Store last few selected pupils for quick reuse
let sidebarSelectedPupil = null; // Store the currently selected pupil in the sidebar

function isoDayName(iso) {
  const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return names[(iso - 1 + 7) % 7] || 'Monday';
}

function formatCycleWeeks(weeks) {
  const safeWeeks = Math.max(0, parseInt(weeks, 10) || 0);
  return safeWeeks === 0 ? 'Every week' : `Every ${safeWeeks} week${safeWeeks === 1 ? '' : 's'}`;
}

// Replace any lingering "merit" wording in error messages with "APs"
function normalizeAPLabel(msg) {
  return msg ? msg.replace(/merits?/gi, 'APs') : msg;
}

document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const prizeContainer = document.getElementById('prizeContainer');
  const pupilModal = document.getElementById('pupilModal');
  const closeModal = document.getElementById('closeModal');
  const pupilSearchInput = document.getElementById('pupilSearch');
  const sidebarPupilSearchInput = document.getElementById('sidebarPupilSearch');
  const searchResultsDiv = document.getElementById('searchResults');
  const sidebarSearchResultsDiv = document.getElementById('sidebarSearchResults');
  const selectedPupilDisplay = document.getElementById('selectedPupilDisplay');
  const recentPupilsDiv = document.getElementById('recentPupils');
  const confirmationModal = document.getElementById('confirmationModal');
  const closeConfirmation = document.getElementById('closeConfirmation');
  const confirmationOkBtn = document.getElementById('confirmationOkBtn');
  const confirmationMessage = document.getElementById('confirmationMessage');
  const cancelPurchaseBtn = document.getElementById('cancelPurchaseBtn');
  const signOutBtn = document.getElementById('signOutBtn');

  // Event Handlers
  signOutBtn.addEventListener('click', () => {
    window.location.href = '/logout';
  });

  // 1) Load all prizes
  loadPrizes();

  // 2) Modal handling
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

  closeModal.addEventListener('click', () => {
    hideModal(pupilModal);
    selectedPrizeId = null;
    selectedPrizeDescription = '';
  });

  closeConfirmation.addEventListener('click', () => {
    hideModal(confirmationModal);
  });

  confirmationOkBtn.addEventListener('click', () => {
    hideModal(confirmationModal);
  });

  // 3) Search Pupils on input (modal)
  let searchTimeout = null;
  pupilSearchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const query = pupilSearchInput.value.trim();
    if (!query) {
      searchResultsDiv.innerHTML = '';
      return;
    }
    // Add small delay to avoid spamming
    searchTimeout = setTimeout(() => {
      searchPupils(query, searchResultsDiv, false);
    }, 300);
  });

  // 4) Search Pupils on input (sidebar)
  let sidebarSearchTimeout = null;
  sidebarPupilSearchInput.addEventListener('input', () => {
    clearTimeout(sidebarSearchTimeout);
    const query = sidebarPupilSearchInput.value.trim();
    if (!query) {
      sidebarSearchResultsDiv.innerHTML = '';
      return;
    }
    // Add small delay to avoid spamming
    sidebarSearchTimeout = setTimeout(() => {
      searchPupils(query, sidebarSearchResultsDiv, true);
    }, 300);
  });

  // 5) Focus search field when modal opens
  pupilModal.addEventListener('transitionend', (e) => {
    if (pupilModal.classList.contains('show')) {
      pupilSearchInput.focus();
    }
  });

  /**
   * Fetch the up-to-date remaining-merits for a pupil by name.
   * @param {number} pupilId
   * @param {string} pupilName  // e.g. "Alice Smith"
   * @returns {Promise<number|null>}  remaining merits, or null on error
   */
  async function fetchUpdatedMerits(pupilId, pupilName) {
    try {
      const res = await fetch(
        `/purchase/searchPupil?query=${encodeURIComponent(pupilName)}`
      );
      if (!res.ok) throw new Error('Search failed');
      const pupils = await res.json();
      const p = pupils.find(x => x.pupil_id === pupilId);
      return p ? p.merits : null;
    } catch (err) {
      console.error('Error fetching updated APs:', err);
      return null;
    }
  }


  // 6) Load Prizes from server
  async function loadPrizes() {
    try {
      const res = await fetch('/purchase/allPrizes');
      if (!res.ok) throw new Error('Failed to load prizes');
      const prizes = await res.json();
      prizeContainer.innerHTML = '';

      prizes.forEach((prize, index) => {
        const currentStock = Math.max(Number(prize.current_stock ?? 0), 0);
        const outOfStock = currentStock <= 0;
        const isCycle = !!prize.is_cycle_limited;
        const spacesLabel = isCycle
          ? `${currentStock} of ${prize.spaces_per_cycle ?? 0} spaces left`
          : `${currentStock} in stock`;
        const outOfStockLabel = isCycle ? 'No spaces left this cycle' : 'Out of stock';
        const cycleMeta = isCycle
          ? `<div class="cycle-meta">${formatCycleWeeks(prize.cycle_weeks)} · Resets ${isoDayName(prize.reset_day_iso)} 02:00</div>`
          : '';

        const card = document.createElement('div');
        card.className = `prize-card${outOfStock ? ' out-of-stock' : ''}`;
        card.style.animationDelay = `${index * 0.05}s`;

        card.innerHTML = `
          <img src="${prize.image_path || '/images/default-prize.png'}" alt="${prize.description}" onerror="this.src='/images/default-prize.png'">
          <div class="prize-card-content">
            <h3>${prize.description}</h3>
            <span class="prize-cost">${prize.cost_merits}</span>
            <div class="stock-badge ${outOfStock ? 'stock-empty' : ''}">
              ${outOfStock ? outOfStockLabel : spacesLabel}
            </div>
            ${cycleMeta}
          </div>
        `;

        card.addEventListener('click', () => {
          if (outOfStock) {
            alert('This prize is out of stock.');
            return;
          }
          if (sidebarSelectedPupil) {
            // If a pupil is selected in the sidebar, proceed with purchase
            handlePurchase(
              sidebarSelectedPupil.pupil_id,
              `${sidebarSelectedPupil.first_name} ${sidebarSelectedPupil.last_name}`,
              sidebarSelectedPupil.merits,
              prize.prize_id,
              prize.description
            );
          } else {
            // Otherwise open the modal to select a pupil
            selectedPrizeId = prize.prize_id;
            selectedPrizeDescription = prize.description;
            showModal(pupilModal);
            pupilSearchInput.value = '';
            searchResultsDiv.innerHTML = '';
            renderRecentPupils();
          }
        });

        prizeContainer.appendChild(card);
      });
    } catch (err) {
      console.error('Error loading prizes:', err);
      prizeContainer.innerHTML = '<p style="text-align:center; color:var(--danger);">Failed to load prizes. Please refresh the page.</p>';
    }
  }

  // 7) Search Pupils by partial name
  async function searchPupils(query, resultsDiv, isSidebar) {
    try {
      resultsDiv.innerHTML = '<p style="text-align:center;">Searching...</p>';

      const res = await fetch(`/purchase/searchPupil?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Failed to search pupils');

      const pupils = await res.json();
      resultsDiv.innerHTML = '';

      if (pupils.length === 0) {
        resultsDiv.innerHTML = '<p style="text-align:center;">No pupils found</p>';
        return;
      }

      pupils.forEach(pupil => {
        const div = document.createElement('div');
        div.className = 'pupil-item';
        div.innerHTML = `
          <span class="pupil-name">${pupil.first_name} ${pupil.last_name}</span>
          <span class="pupil-merits">${pupil.merits}</span>
        `;

        if (isSidebar) {
          // For sidebar, select the pupil for later use
          div.addEventListener('click', () => {
            selectSidebarPupil(pupil);
          });
        } else {
          // For modal, proceed with purchase
          div.addEventListener('click', () => {
            handlePurchase(
              pupil.pupil_id,
              `${pupil.first_name} ${pupil.last_name}`,
              pupil.merits
            );
          });
        }

        resultsDiv.appendChild(div);
      });
    } catch (err) {
      console.error('Error searching pupils:', err);
      resultsDiv.innerHTML = '<p style="text-align:center; color:var(--danger);">Error searching. Please try again.</p>';
    }
  }

  // 8) Select a pupil from the sidebar
  function selectSidebarPupil(pupil) {
    sidebarSelectedPupil = pupil;
    sidebarPupilSearchInput.value = ''; // Clear search input
    sidebarSearchResultsDiv.innerHTML = ''; // Clear search results

    // Update the selected pupil display
    selectedPupilDisplay.innerHTML = `
      <div class="pupil-info-card">
        <div class="pupil-name-display">${pupil.first_name} ${pupil.last_name}</div>
        <div class="merit-display">Available APs<span class="merit-value">${pupil.merits}</span></div>
      </div>
    `;
  }

  // 9) Handle the actual purchase
  async function handlePurchase(pupil_id, pupilName, currentMerits, prizeId = null, prizeDesc = null) {
    // Use the active prize or the one passed as parameter
    const activePrizeId = prizeId || selectedPrizeId;
    const activePrizeDesc = prizeDesc || selectedPrizeDescription;

    if (!activePrizeId) return;

    try {
      const res = await fetch('/purchase/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prize_id: activePrizeId, pupil_id })
      });

      if (!res.ok) {
        const errorData = await res.json();
        const normalizedError = normalizeAPLabel(errorData.error);
        alert(normalizedError || 'Error creating purchase');
        return;
      }

      const data = await res.json();
      if (data.success) {
        currentPurchaseId = data.newPurchaseId;
        currentPupilId = pupil_id;
        currentPupilName = pupilName;
        currentPrizeMerits = data.meritCost || 0; // Store merit cost if available

        confirmationMessage.innerHTML = `
          <p>Successfully purchased <span class="highlight">${activePrizeDesc}</span>
          for <span class="highlight">${pupilName}</span>.</p>
          <p style="margin-top:10px;">Remaining APs: <span class="highlight">${data.newRemaining}</span></p>`;

        // Show the cancel button for new purchases
        cancelPurchaseBtn.style.display = 'block';

        hideModal(pupilModal);
        showModal(confirmationModal);

        // Add to recent pupils
        const pupilObj = {
          pupil_id: pupil_id,
          first_name: pupilName.split(' ')[0],
          last_name: pupilName.split(' ').slice(1).join(' '),
          merits: data.newRemaining
        };

        addRecentPupil(pupilObj);

        // If it's the sidebar-selected pupil, update the merit count
        if (sidebarSelectedPupil && sidebarSelectedPupil.pupil_id === pupil_id) {
          sidebarSelectedPupil.merits = data.newRemaining;
          selectSidebarPupil(sidebarSelectedPupil);
        }

        // Refresh prizes so stock/space counts update immediately in the UI
        await loadPrizes();
      }
    } catch (err) {
      console.error('Error creating purchase:', err);
      alert('Error processing purchase. Please try again.');
    }
  }

  // 10) Render recent pupils
  function renderRecentPupils() {
    recentPupilsDiv.innerHTML = '';

    if (recentPupils.length === 0) {
      recentPupilsDiv.innerHTML = '<p style="text-align:center;">No recent pupils</p>';
      return;
    }

    recentPupils.forEach(pupil => {
      const div = document.createElement('div');
      div.className = 'pupil-item';
      div.innerHTML = `
        <span class="pupil-name">${pupil.first_name} ${pupil.last_name}</span>
        <span class="pupil-merits">${pupil.merits}</span>
      `;
      div.addEventListener('click', () => {
        handlePurchase(pupil.pupil_id, `${pupil.first_name} ${pupil.last_name}`, pupil.merits);
      });
      recentPupilsDiv.appendChild(div);
    });
  }

  // 11) Add to recent pupils
  function addRecentPupil(pupil) {
    // Remove if already exists
    recentPupils = recentPupils.filter(p => p.pupil_id !== pupil.pupil_id);

    // Add to front
    recentPupils.unshift(pupil);

    // Limit to 5
    if (recentPupils.length > 5) {
      recentPupils.pop();
    }
  }

  // 12) Cancel Purchase
  cancelPurchaseBtn.addEventListener('click', async () => {
    if (!currentPurchaseId) {
      hideModal(confirmationModal);
      return;
    }

    try {
      cancelPurchaseBtn.textContent = "Canceling...";

      const res = await fetch(`/purchase/cancel/${currentPurchaseId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to cancel purchase');
      const data = await res.json();

      if (data.success) {
        confirmationMessage.innerHTML = `<p>Purchase cancelled successfully.</p>`;

        // Hide the cancel button once purchase is cancelled
        cancelPurchaseBtn.style.display = 'none';

        // —— NEW CODE: update the sidebar display for the selected pupil ——
        if (sidebarSelectedPupil &&
          sidebarSelectedPupil.pupil_id === currentPupilId) {
          const updated = await fetchUpdatedMerits(currentPupilId, currentPupilName);
          if (updated !== null) {
            sidebarSelectedPupil.merits = updated;
            selectSidebarPupil(sidebarSelectedPupil);
          }
        }
        // — end new code —

        // Refresh prizes so stock is restored in the list after a cancel
        await loadPrizes();

      } else {
        confirmationMessage.innerHTML =
          `<p style="color:red">Error: ${data.error}</p>`;
      }
    } catch (err) {
      console.error('Error cancelling purchase:', err);
      confirmationMessage.innerHTML =
        `<p style="color:red">Error: Could not cancel purchase</p>`;
    } finally {
      cancelPurchaseBtn.textContent = "Cancel Purchase";
    }
  });

  // 13) Update pupil merit count in UI elements
  function updatePupilMeritCount(pupilId, newMeritCount) {
    // Update in recent pupils list
    for (let i = 0; i < recentPupils.length; i++) {
      if (recentPupils[i].pupil_id === pupilId) {
        recentPupils[i].merits = newMeritCount;
        break;
      }
    }
  }

  // 14) Fetch updated merit count for a pupil
  async function fetchUpdatedMeritCount(pupilId) {
    try {
      const res = await fetch(`/purchase/pupilMerits/${pupilId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.merits;
    } catch (err) {
      console.error('Error fetching updated APs:', err);
      return null;
    }
  }

  // Handle clicks outside modals to close them
  window.addEventListener('click', (e) => {
    if (e.target === pupilModal) {
      hideModal(pupilModal);
    } else if (e.target === confirmationModal) {
      hideModal(confirmationModal);
    }
  });
});
