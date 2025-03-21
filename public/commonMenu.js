// public/commonMenu.js
const menuHTML = `
  <div id="topMenu" style="
    display: flex; 
    justify-content: center; 
    align-items: center; 
    background-color: #003a69;
    color: #ffffff;
    padding: 10px 0;
    position: relative;
  ">
    <nav>
      <a href="/pupils" style="margin: 0 10px; color: #ffffff; text-decoration: none;">Manage Pupils</a>
      <a href="/prizes" style="margin: 0 10px; color: #ffffff; text-decoration: none;">Manage Prizes</a>
      <a href="/purchase" style="margin: 0 10px; color: #ffffff; text-decoration: none;">Purchase Prizes</a>
      <a href="/upload/csv/pupils" style="margin: 0 10px; color: #ffffff; text-decoration: none;">Upload Pupils CSV</a>
      <a href="/upload/csv/merits" style="margin: 0 10px; color: #ffffff; text-decoration: none;">Upload Merits CSV</a>
    </nav>
    <button id="signOutBtn" style="
      position: absolute; 
      right: 20px; 
      background-color: #005a98; 
      border: none; 
      color: #ffffff; 
      padding: 8px 16px; 
      cursor: pointer; 
      border-radius: 4px;
    ">
      Sign Out
    </button>
  </div>
`;

document.addEventListener('DOMContentLoaded', () => {
  // Insert the menu
  document.body.insertAdjacentHTML('afterbegin', menuHTML);

  // Sign out button -> simple redirect to /logout
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      window.location.href = '/logout';
    });
  }
});

