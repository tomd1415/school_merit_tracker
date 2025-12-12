// public/commonModal.js
// Shared modal helpers used across pages to avoid duplicating show/hide logic.
(function modalHelpers() {
  const addShowClass = (el) => {
    // Use rAF so CSS transitions have time to apply.
    requestAnimationFrame(() => el.classList.add('show'));
  };

  const showModal = (modalElement) => {
    if (!modalElement) return;
    modalElement.style.display = 'flex';
    addShowClass(modalElement);
  };

  const hideModal = (modalElement) => {
    if (!modalElement) return;
    modalElement.classList.remove('show');
    setTimeout(() => {
      modalElement.style.display = 'none';
    }, 300);
  };

  // Expose globally but avoid overwriting if already present.
  if (!window.showModal) {
    window.showModal = showModal;
  }
  if (!window.hideModal) {
    window.hideModal = hideModal;
  }
})();
