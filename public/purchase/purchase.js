// public/purchase/purchase.js

let selectedPrizeId = null;
let selectedPrizeDescription = '';
let recentPupils = []; // Store last few selected pupils for quick reuse

document.addEventListener('DOMContentLoaded', () => {
  const prizeContainer = document.getElementById('prizeContainer');
  const pupilModal = document.getElementById('pupilModal');
  const closeModal = document.getElementById('closeModal');
  const pupilSearchInput = document.getElementById('pupilSearch');
  const searchResultsDiv = document.getElementById('searchResults');
  const recentPupilsDiv = document.getElementById('recentPupils');

  // Elements for the confirmation modal
  const confirmationModal = document.getElementById('confirmationModal');
  const closeConfirmation = document.getElementById('closeConfirmation');
  const confirmationOkBtn = document.getElementById('confirmationOkBtn');
  const confirmationMessage = document.getElementById('confirmationMessage');
  const cancelPurchaseBtn = document.getElementById('cancelPurchaseBtn');

//cancelPurchaseBtn.addEventListener('click', () => {
  // This is where you'd call a route to revert the purchase if you want 
  // (e.g., /purchase/cancel/:purchaseId), or simply hide the modal.
  // If the purchase was already saved in the DB, you'd need a special 
  // route or logic to 'void' or 'delete' the record.

  // If you only want to dismiss the modal without any DB changes:
//  confirmationModal.style.display = 'none';
//});

  // 1) Load all prizes
  loadPrizes();

  // 2) Click to close modal
  closeModal.addEventListener('click', () => {
    pupilModal.style.display = 'none';
    selectedPrizeId = null; // reset
    selectedPrizeDescription = '';
  });

  // Close confirmation modal (both the X and the OK button)
  closeConfirmation.addEventListener('click', () => {
    confirmationModal.style.display = 'none';
  });
  confirmationOkBtn.addEventListener('click', () => {
    confirmationModal.style.display = 'none';
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

  // 4) Render recent pupils
  function renderRecentPupils() {
    recentPupilsDiv.innerHTML = '';
    recentPupils.forEach(p => {
      const div = document.createElement('div');
      div.textContent = `${p.first_name} ${p.last_name} (Merits: ${p.merits})`;
      div.addEventListener('click', () => {
        handlePurchase(p.pupil_id, p.first_name + ' ' + p.last_name);
      });
      recentPupilsDiv.appendChild(div);
    });
  }

  // 5) Load Prizes from server
  async function loadPrizes() {
    try {
      const res = await fetch('/purchase/allPrizes');
      if (!res.ok) throw new Error('Failed to load prizes');
      const prizes = await res.json();
      prizeContainer.innerHTML = '';
      prizes.forEach(prize => {
        const card = document.createElement('div');
        card.className = 'prize-card';
        card.innerHTML = `
          <img src="${prize.image_path}" alt="Prize Image">
          <h3>${prize.description}</h3>
          <p>Cost (Merits): ${prize.cost_merits}</p>
        `;
        card.addEventListener('click', () => {
          // store the selected prize_id
          selectedPrizeId = prize.prize_id;
          selectedPrizeDescription = prize.description;
          // open the modal
          pupilModal.style.display = 'block';
          pupilSearchInput.value = '';
          searchResultsDiv.innerHTML = '';
        });
        prizeContainer.appendChild(card);
      });
    } catch (err) {
      console.error(err);
    }
  }

  // 6) Search Pupils by partial name
  async function searchPupils(query) {
    try {
      const res = await fetch(`/purchase/searchPupil?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Failed to search pupils');
      const pupils = await res.json();
      searchResultsDiv.innerHTML = '';
      pupils.forEach(p => {
        const div = document.createElement('div');
        div.textContent = `${p.first_name} ${p.last_name} (Merits: ${p.merits})`;
        div.addEventListener('click', () => handlePurchase(p.pupil_id, p.first_name + ' ' + p.last_name));
        searchResultsDiv.appendChild(div);
      });
    } catch (err) {
      console.error(err);
    }
  }

 // 7) Handle the actual purchase
async function handlePurchase(pupil_id, pupilName) {
  if (!selectedPrizeId) return; // no prize selected => do nothing
  try {
    const res = await fetch('/purchase/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prize_id: selectedPrizeId, pupil_id })
    });

    if (!res.ok) {
      const errorData = await res.json();
      // This is where you'd still show an alert if the pupil has insufficient merits (or any error):
      alert(errorData.error || 'Error creating purchase');
      return;
    }

    const data = await res.json();
    if (data.success) {
      // 1) Remove or comment out the alert:
      // alert(`Purchase successful! New merits: ${data.newRemaining}`);
      currentPurchaseId = data.newPurchaseId;
      // 2) Show the confirmation modal instead:
      confirmationMessage.innerHTML = `
        Successfully purchased <span class="highlight">${selectedPrizeDescription}</span>
        for <span class="highlight">${pupilName}</span>.<br>
        Remaining merits: <span class="highlight">${data.newRemaining}</span>        `;
      confirmationModal.style.display = 'block';

      // 3) Update recent pupils (so we can tap them again quickly)
      addRecentPupil(pupil_id, data.newMerits);

      // 4) Optionally close the "select pupil" modal, if it's still open
      pupilModal.style.display = 'none';
    }
  } catch (err) {
    console.error(err);
    alert('Error creating purchase');
  }
}
  // 8) Add or update recent pupil in the array
  //    We'll need to fetch the pupil name if we don't have it,
  //    but we do from the search results (maybe store that).
  function addRecentPupil(pupil_id, newMerits) {
    // We'll do a quick approach: if the pupil was one of the search results,
    // we likely already have first_name, last_name, etc. 
    // But we haven't stored it. Let's do a direct approach with a short fetch:

    fetch(`/purchase/searchPupil?query=${pupil_id}`)
      .then(r => r.json())
      .then(list => {
        // We'll see if any pupil matches exactly
        const found = list.find(x => x.pupil_id === pupil_id);
        if (found) {
          found.merits = newMerits; // update merits
          // remove existing if in array
          recentPupils = recentPupils.filter(rp => rp.pupil_id !== pupil_id);
          // unshift to front
          recentPupils.unshift(found);
          // limit to 5
          if (recentPupils.length > 5) {
            recentPupils.pop();
          }
          renderRecentPupils();
        }
      });
  }
    // When user clicks “Cancel Purchase”
  cancelPurchaseBtn.addEventListener('click', async () => {
    if (!currentPurchaseId) {
      // If there's no purchase ID saved, just close the modal or do nothing
      confirmationModal.style.display = 'none';
      return;
    }

    // Call the new route
    try {
      const res = await fetch(`/purchase/cancel/${currentPurchaseId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to cancel purchase');

      const result = await res.json();
      if (result.success) {
        // e.g. show a message or reload updated data
        alert('Purchase canceled.');

        // Hide the modal
        confirmationModal.style.display = 'none';

        // Optionally clear the stored ID
        currentPurchaseId = null;
      } else {
        alert(result.error || 'Could not cancel purchase');
      }
    } catch (err) {
      console.error(err);
      alert('Error canceling purchase');
    }
  });
});

