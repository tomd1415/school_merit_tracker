// public/orders/orders.js
document.addEventListener('DOMContentLoaded', () => {
  const yearFilter = document.getElementById('yearFilter');
  const formFilter = document.getElementById('formFilter');
  const startDateInput = document.getElementById('startDateInput');
  const endDateInput = document.getElementById('endDateInput');
  const modeToggle = document.getElementById('modeToggle');
  const modeHint = document.getElementById('modeHint');
  const refreshBtn = document.getElementById('refreshBtn');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const ordersTableBody = document.querySelector('#ordersTable tbody');
  const ordersSubtitle = document.getElementById('ordersSubtitle');
  const lastUpdated = document.getElementById('lastUpdated');
  const pendingCount = document.getElementById('pendingCount');
  const collectedCount = document.getElementById('collectedCount');
  const refundedCount = document.getElementById('refundedCount');
  const totalCount = document.getElementById('totalCount');
  const dateFields = document.querySelectorAll('.date-field');

  const pupilSearchInput = document.getElementById('pupilSearchInput');
  const pupilSearchResults = document.getElementById('pupilSearchResults');
  const selectedPupilPill = document.getElementById('selectedPupilPill');
  const selectedPupilName = document.getElementById('selectedPupilName');
  const clearPupilBtn = document.getElementById('clearPupilBtn');

  let forms = [];
  const state = {
    mode: 'current',       // current | all
    yearGroup: 'all',
    formId: 'all',
    pupilId: null,
    pupilName: '',
    startDate: '',
    endDate: '',
    orders: [],
    summary: { total: 0, pending: 0, collected: 0, refunded: 0 }
  };

  const debounce = (fn, delay = 250) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const formatDate = (date) => date.toISOString().split('T')[0];
  const formatDateTime = (value) => {
    if (!value) return { date: '-', time: '' };
    const d = new Date(value);
    return {
      date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const loadForms = async () => {
    try {
      const res = await fetch('/orders/filters');
      const data = await res.json();
      forms = Array.isArray(data.forms) ? data.forms : [];
      renderYearOptions();
      renderFormOptions();
    } catch (error) {
      console.error('Error loading forms:', error);
    }
  };

  const renderYearOptions = () => {
    const years = Array.from(new Set(forms.map(f => f.year_group))).sort((a, b) => a - b);
    yearFilter.innerHTML = `<option value="all">All year groups</option>`;
    years.forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = `Year ${year}`;
      yearFilter.appendChild(option);
    });
    yearFilter.value = state.yearGroup;
  };

  const renderFormOptions = () => {
    const relevantForms = forms.filter(f => state.yearGroup === 'all' || String(f.year_group) === String(state.yearGroup));
    formFilter.innerHTML = `<option value="all">All forms</option>`;
    relevantForms.forEach(form => {
      const option = document.createElement('option');
      option.value = form.form_id;
      option.textContent = `${form.form_name} (Y${form.year_group})`;
      formFilter.appendChild(option);
    });

    const formStillAvailable = relevantForms.some(f => String(f.form_id) === String(state.formId));
    if (!formStillAvailable) {
      state.formId = 'all';
    }
    formFilter.value = state.formId;
  };

  const toggleDateFields = (enable) => {
    dateFields.forEach(wrapper => {
      const input = wrapper.querySelector('input');
      input.disabled = !enable;
      wrapper.classList.toggle('disabled', !enable);
    });
  };

  const ensureDefaultDates = () => {
    if (state.startDate || state.endDate) return;
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 30);
    state.startDate = formatDate(start);
    state.endDate = formatDate(today);
    startDateInput.value = state.startDate;
    endDateInput.value = state.endDate;
  };

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.set('mode', state.mode);
    if (state.yearGroup !== 'all') params.set('yearGroup', state.yearGroup);
    if (state.formId !== 'all') params.set('formId', state.formId);
    if (state.pupilId) params.set('pupilId', state.pupilId);
    if (state.mode === 'all') {
      if (state.startDate) params.set('startDate', state.startDate);
      if (state.endDate) params.set('endDate', state.endDate);
    }
    return params.toString();
  };

  const fetchOrders = async () => {
    ordersSubtitle.textContent = 'Loading orders...';
    ordersTableBody.innerHTML = `
      <tr><td colspan="5" class="muted-text" style="text-align:center;">Loading...</td></tr>
    `;
    try {
      const query = buildQueryParams();
      const res = await fetch(`/orders/list?${query}`);
      const data = await res.json();
      state.orders = Array.isArray(data.orders) ? data.orders : [];
      state.summary = data.summary || { total: 0, pending: 0, collected: 0, refunded: 0 };
      renderOrders();
      renderSummary();
    } catch (error) {
      console.error('Error fetching orders:', error);
      ordersSubtitle.textContent = 'Could not load orders.';
      ordersTableBody.innerHTML = `
        <tr><td colspan="5" class="muted-text" style="text-align:center;">Failed to load orders. Try again.</td></tr>
      `;
    }
  };

  const renderSummary = () => {
    pendingCount.textContent = state.summary.pending || 0;
    collectedCount.textContent = state.summary.collected || 0;
    refundedCount.textContent = state.summary.refunded || 0;
    totalCount.textContent = state.summary.total || 0;
  };

  const renderOrders = () => {
    if (!state.orders.length) {
      ordersSubtitle.textContent = 'No orders for the selected filters.';
      ordersTableBody.innerHTML = `
        <tr><td class="empty-state" colspan="5">No orders match your filters.</td></tr>
      `;
      lastUpdated.textContent = '';
      return;
    }

    ordersSubtitle.textContent = `${state.orders.length} order${state.orders.length === 1 ? '' : 's'} shown`;
    lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    ordersTableBody.innerHTML = '';

    state.orders.forEach(order => {
      const { date: placedDate, time } = formatDateTime(order.date);
      const status = (order.status || 'pending').toLowerCase();
      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
      const actionsHtml = renderActions(order);

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="pupil-cell">
          <div class="name">${order.first_name} ${order.last_name}</div>
          <div class="meta">${order.form_name} • Year ${order.year_group}</div>
        </td>
        <td class="prize-cell">
          <div class="prize-name">${order.prize_description}</div>
          <div class="cost">${order.cost_merits} APs</div>
        </td>
        <td class="date-cell">
          <div>${placedDate}</div>
          <div class="time">${time}</div>
        </td>
        <td>
          <span class="status-badge status-${status}">${statusLabel}</span>
        </td>
        <td class="actions-cell">
          <div class="actions-wrapper">
            ${actionsHtml}
          </div>
        </td>
      `;
      ordersTableBody.appendChild(row);
    });
  };

  const renderActions = (order) => {
    const status = (order.status || 'pending').toLowerCase();
    const buttons = [];

    if (status === 'pending') {
      buttons.push(`<button class="action-btn collect-btn" data-id="${order.purchase_id}">Mark collected</button>`);
      buttons.push(`<button class="action-btn ghost-btn danger-outline refund-btn" data-id="${order.purchase_id}">Refund</button>`);
    } else if (status === 'collected') {
      buttons.push(`<button class="action-btn ghost-btn danger-outline refund-btn" data-id="${order.purchase_id}">Refund</button>`);
    } else {
      buttons.push(`<span class="muted-text">No actions</span>`);
    }

    return buttons.join('');
  };

  const markCollected = async (purchaseId, btn) => {
    if (!purchaseId) return;
    if (btn) btn.disabled = true;
    try {
      const res = await fetch(`/orders/${purchaseId}/collect`, { method: 'PATCH' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to mark collected');
      await fetchOrders();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Could not mark as collected. Please try again.');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  const markRefunded = async (purchaseId, btn) => {
    if (!purchaseId) return;
    if (btn) btn.disabled = true;
    try {
      const res = await fetch(`/orders/${purchaseId}/refund`, { method: 'PATCH' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to refund purchase');
      await fetchOrders();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Could not refund this purchase. Please try again.');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // Search helpers
  const renderSearchResults = (pupils) => {
    if (!pupils || !pupils.length) {
      pupilSearchResults.innerHTML = `<div class="autocomplete-item muted-text">No pupils found</div>`;
      pupilSearchResults.style.display = 'block';
      return;
    }

    pupilSearchResults.innerHTML = '';
    pupils.forEach(pupil => {
      const div = document.createElement('div');
      div.className = 'autocomplete-item';
      div.dataset.id = pupil.pupil_id;
      div.innerHTML = `
        <div>
          <div class="autocomplete-name">${pupil.first_name} ${pupil.last_name}</div>
          <div class="autocomplete-meta">${pupil.form_name || ''}${pupil.form_name ? ' • ' : ''}Year ${pupil.year_group || '-'}</div>
        </div>
        <div class="autocomplete-meta">${pupil.merits != null ? `${pupil.merits} APs` : ''}</div>
      `;
      div.addEventListener('click', () => {
        selectPupil(pupil);
      });
      pupilSearchResults.appendChild(div);
    });
    pupilSearchResults.style.display = 'block';
  };

  const selectPupil = (pupil) => {
    state.pupilId = pupil.pupil_id;
    state.pupilName = `${pupil.first_name} ${pupil.last_name}`;
    pupilSearchInput.value = '';
    pupilSearchResults.innerHTML = '';
    pupilSearchResults.style.display = 'none';
    selectedPupilName.textContent = state.pupilName;
    selectedPupilPill.style.display = 'inline-flex';
    fetchOrders();
  };

  const clearPupilFilter = () => {
    state.pupilId = null;
    state.pupilName = '';
    selectedPupilPill.style.display = 'none';
    pupilSearchInput.value = '';
    fetchOrders();
  };

  // Event bindings
  modeToggle.addEventListener('change', () => {
    state.mode = modeToggle.checked ? 'all' : 'current';
    modeHint.textContent = state.mode === 'all'
      ? 'Showing all orders. Use the date range to narrow results.'
      : 'Showing only pending orders.';

    if (state.mode === 'all') {
      ensureDefaultDates();
    } else {
      state.startDate = '';
      state.endDate = '';
      startDateInput.value = '';
      endDateInput.value = '';
    }
    toggleDateFields(state.mode === 'all');
    fetchOrders();
  });

  yearFilter.addEventListener('change', () => {
    state.yearGroup = yearFilter.value;
    renderFormOptions();
    fetchOrders();
  });

  formFilter.addEventListener('change', () => {
    state.formId = formFilter.value;
    fetchOrders();
  });

  [startDateInput, endDateInput].forEach(input => {
    input.addEventListener('change', () => {
      if (state.mode !== 'all') return;
      const value = input.value;
      if (input.id === 'startDateInput') state.startDate = value;
      if (input.id === 'endDateInput') state.endDate = value;
      fetchOrders();
    });
  });

  refreshBtn.addEventListener('click', () => {
    fetchOrders();
  });

  resetFiltersBtn.addEventListener('click', () => {
    state.mode = 'current';
    modeToggle.checked = false;
    modeHint.textContent = 'Showing only pending orders.';
    state.yearGroup = 'all';
    state.formId = 'all';
    state.pupilId = null;
    state.pupilName = '';
    state.startDate = '';
    state.endDate = '';
    yearFilter.value = 'all';
    renderFormOptions();
    formFilter.value = 'all';
    startDateInput.value = '';
    endDateInput.value = '';
    toggleDateFields(false);
    selectedPupilPill.style.display = 'none';
    fetchOrders();
  });

  pupilSearchInput.addEventListener('input', debounce(async () => {
    const term = pupilSearchInput.value.trim();
    if (!term || term.length < 2) {
      pupilSearchResults.innerHTML = '';
      pupilSearchResults.style.display = 'none';
      return;
    }

    try {
      const res = await fetch(`/purchase/searchPupil?query=${encodeURIComponent(term)}`);
      if (!res.ok) throw new Error('Search failed');
      const pupils = await res.json();
      renderSearchResults(pupils);
    } catch (error) {
      console.error('Pupil search error:', error);
      pupilSearchResults.innerHTML = `<div class="autocomplete-item muted-text">Search failed</div>`;
      pupilSearchResults.style.display = 'block';
    }
  }, 250));

  clearPupilBtn.addEventListener('click', clearPupilFilter);

  document.addEventListener('click', (e) => {
    if (!pupilSearchResults.contains(e.target) && e.target !== pupilSearchInput) {
      pupilSearchResults.style.display = 'none';
    }
  });

  ordersTableBody.addEventListener('click', (e) => {
    const collectBtn = e.target.closest('.collect-btn');
    const refundBtn = e.target.closest('.refund-btn');

    if (collectBtn) {
      const id = collectBtn.getAttribute('data-id');
      markCollected(id, collectBtn);
    } else if (refundBtn) {
      const id = refundBtn.getAttribute('data-id');
      const confirmRefund = confirm('Refund this purchase and return APs to the pupil?');
      if (confirmRefund) {
        markRefunded(id, refundBtn);
      }
    }
  });

  // Init
  toggleDateFields(false);
  loadForms().then(fetchOrders);
});
