// public/purchase/purchase.js

let selectedPrizeId = null;
let selectedPrizeDescription = '';
let currentPurchaseId = null;
let currentPupilId = null; // Store the pupil ID for the current purchase
let currentPupilName = null; // Store the pupil name for the current purchase
let currentPrizeMerits = null; // Store the merit cost of the current purchase
let recentPupils = []; // Store last few selected pupils for quick reuse

document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const prizeContainer = document.getElementById('prizeContainer');
  const pupilModal = document.getElementById('pupilModal');
  const closeModal = document.getElementById('closeModal');
  const pupilSearchInput = document.getElementById('pupilSearch');
  const searchResultsDiv = document.getElementById('searchResults');
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

  // 3) Search Pupils on input
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
      searchPupils(query);
    }, 300);
  });

  // 4) Focus search field when modal opens
  pupilModal.addEventListener('transitionend', (e) => {
    if (pupilModal.classList.contains('show')) {
      pupilSearchInput.focus();
    }
  });

  // 5) Load Prizes from server
  async function loadPrizes() {
    try {
      const res = await fetch('/purchase/allPrizes');
      if (!res.ok) throw new Error('Failed to load prizes');
      const prizes = await res.json();
      prizeContainer.innerHTML = '';
      
      prizes.forEach((prize, index) => {
        const card = document.createElement('div');
        card.className = 'prize-card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        card.innerHTML = `
          <img src="${prize.image_path || '/images/default-prize.png'}" alt="${prize.description}" onerror="this.src='/images/default-prize.png'">
          <div class="prize-card-content">
            <h3>${prize.description}</h3>
            <p>${prize.cost_merits} Merits</p>
          </div>
        `;
        
        card.addEventListener('click', () => {
          selectedPrizeId = prize.prize_id;
          selectedPrizeDescription = prize.description;
          showModal(pupilModal);
          pupilSearchInput.value = '';
          searchResultsDiv.innerHTML = '';
          renderRecentPupils();
        });
        
        prizeContainer.appendChild(card);
      });
    } catch (err) {
      console.error('Error loading prizes:', err);
      prizeContainer.innerHTML = '<p style="text-align:center; color:var(--danger);">Failed to load prizes. Please refresh the page.</p>';
    }
  }

  // 6) Search Pupils by partial name
  async function searchPupils(query) {
    try {
      searchResultsDiv.innerHTML = '<p style="text-align:center;">Searching...</p>';
      
      const res = await fetch(`/purchase/searchPupil?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Failed to search pupils');
      
      const pupils = await res.json();
      searchResultsDiv.innerHTML = '';
      
      if (pupils.length === 0) {
        searchResultsDiv.innerHTML = '<p style="text-align:center;">No pupils found</p>';
        return;
      }
      
      pupils.forEach(pupil => {
        const div = document.createElement('div');
        div.className = 'pupil-item';
        div.innerHTML = `
          <span class="pupil-name">${pupil.first_name} ${pupil.last_name}</span>
          <span class="pupil-merits">${pupil.merits} Merits</span>
        `;
        div.addEventListener('click', () => {
          handlePurchase(pupil.pupil_id, `${pupil.first_name} ${pupil.last_name}`, pupil.merits);
        });
        searchResultsDiv.appendChild(div);
      });
    } catch (err) {
      console.error('Error searching pupils:', err);
      searchResultsDiv.innerHTML = '<p style="text-align:center; color:var(--danger);">Error searching. Please try again.</p>';
    }
  }

  // 7) Handle the actual purchase
  async function handlePurchase(pupil_id, pupilName, currentMerits) {
    if (!selectedPrizeId) return;
    
    try {
      const res = await fetch('/purchase/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prize_id: selectedPrizeId, pupil_id })
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || 'Error creating purchase');
        return;
      }

      const data = await res.json();
      if (data.success) {
        currentPurchaseId = data.newPurchaseId;
        currentPupilId = pupil_id;
        currentPupilName = pupilName;
        currentPrizeMerits = data.meritCost || 0; // Store merit cost if available
        
        confirmationMessage.innerHTML = `
          <p>Successfully purchased <span class="highlight">${selectedPrizeDescription}</span>
          for <span class="highlight">${pupilName}</span>.</p>
          <p style="margin-top:10px;">Remaining merits: <span class="highlight">${data.newRemaining}</span></p>`;
        
        hideModal(pupilModal);
        showModal(confirmationModal);

        // Add to recent pupils
        addRecentPupil({
          pupil_id: pupil_id,
          first_name: pupilName.split(' ')[0],
          last_name: pupilName.split(' ').slice(1).join(' '),
          merits: data.newRemaining
        });
      }
    } catch (err) {
      console.error('Error creating purchase:', err);
      alert('Error processing purchase. Please try again.');
    }
  }

  // 8) Render recent pupils
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
        <span class="pupil-merits">${pupil.merits} Merits</span>
      `;
      div.addEventListener('click', () => {
        handlePurchase(pupil.pupil_id, `${pupil.first_name} ${pupil.last_name}`, pupil.merits);
      });
      recentPupilsDiv.appendChild(div);
    });
  }

  // 9) Add to recent pupils
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

  // 10) Cancel Purchase
  cancelPurchaseBtn.addEventListener('click', async () => {
    if (!currentPurchaseId) {
      hideModal(confirmationModal);
      return;
    }

    try {
      cancelPurchaseBtn.textContent = "Canceling...";
      cancelPurchaseBtn.disabled = true;
      
      const res = await fetch(`/purchase/cancel/${currentPurchaseId}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) throw new Error('Failed to cancel purchase');

      const result = await res.json();
      if (result.success) {
        // Update recent pupils list with updated merit count
        if (currentPupilId) {
          // Either use the returned merit count from the server if available
          const newMeritCount = result.updatedMerits || await fetchUpdatedMeritCount(currentPupilId);
          
          // Update the merit count in the recent pupils list
          updatePupilMeritCount(currentPupilId, newMeritCount);
          
          // Re-render the recent pupils list
          renderRecentPupils();
        }
        
        alert('Purchase successfully canceled.');
        hideModal(confirmationModal);
        currentPurchaseId = null;
        currentPupilId = null;
        currentPupilName = null;
      } else {
        alert(result.error || 'Could not cancel purchase');
      }
    } catch (err) {
      console.error('Error canceling purchase:', err);
      alert('Error canceling purchase. Please try again.');
    } finally {
      cancelPurchaseBtn.textContent = "Cancel Purchase";
      cancelPurchaseBtn.disabled = false;
    }
  });

  // Function to update a pupil's merit count in the recent pupils list
  function updatePupilMeritCount(pupilId, newMeritCount) {
    for (let i = 0; i < recentPupils.length; i++) {
      if (recentPupils[i].pupil_id === pupilId) {
        recentPupils[i].merits = newMeritCount;
        break;
      }
    }
  }

  // Function to fetch the updated merit count for a pupil
  async function fetchUpdatedMeritCount(pupilId) {
    try {
      // Search for the pupil to get their updated merit count
      const res = await fetch(`/purchase/searchPupil?query=${pupilId}`);
      if (!res.ok) throw new Error('Failed to fetch updated merit count');
      
      const pupils = await res.json();
      const pupil = pupils.find(p => p.pupil_id === pupilId);
      
      if (pupil) {
        return pupil.merits;
      }
      
      // If pupil not found, try to calculate based on stored values
      // This is a fallback if we can't get the actual value from the server
      const pupilInRecentList = recentPupils.find(p => p.pupil_id === pupilId);
      if (pupilInRecentList && currentPrizeMerits) {
        return pupilInRecentList.merits + currentPrizeMerits;
      }
      
      return 0; // Default fallback
    } catch (err) {
      console.error('Error fetching updated merit count:', err);
      return 0;
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

