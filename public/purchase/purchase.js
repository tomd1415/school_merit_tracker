// public/purchase/purchase.js

let selectedPrizeId = null;
let recentPupils = []; // Store last few selected pupils for quick reuse

document.addEventListener('DOMContentLoaded', () => {
  const prizeContainer = document.getElementById('prizeContainer');
  const pupilModal = document.getElementById('pupilModal');
  const closeModal = document.getElementById('closeModal');
  const pupilSearchInput = document.getElementById('pupilSearch');
  const searchResultsDiv = document.getElementById('searchResults');
  const recentPupilsDiv = document.getElementById('recentPupils');

  // 1) Load all prizes
  loadPrizes();

  // 2) Click to close modal
  closeModal.addEventListener('click', () => {
    pupilModal.style.display = 'none';
    selectedPrizeId = null; // reset
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
        handlePurchase(p.pupil_id);
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
        div.addEventListener('click', () => handlePurchase(p.pupil_id));
        searchResultsDiv.appendChild(div);
      });
    } catch (err) {
      console.error(err);
    }
  }

  // 7) Handle the actual purchase
  async function handlePurchase(pupil_id) {
    if (!selectedPrizeId) return; // no prize selected => do nothing
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
        alert(`Purchase successful! New merits: ${data.newMerits}`);
        // Add pupil to the front of recent pupils
        addRecentPupil(pupil_id, data.newMerits);
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
});

