// js/app.js — API-backed version (server.js handles all data)

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[id="year"]').forEach(el => {
      el.textContent = new Date().getFullYear();
    });
    updateHeader();
  });

  async function isLoggedIn() {
    try {
      const res = await fetch('/me');
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async function updateHeader() {
    const loggedIn = await isLoggedIn();
    const hdrLogin    = document.getElementById('hdr-login');
    const hdrSignup   = document.getElementById('hdr-signup');
    const hdrContinue = document.getElementById('hdr-continue');
    if (loggedIn) {
      hdrLogin    && (hdrLogin.style.display    = 'none');
      hdrSignup   && (hdrSignup.style.display   = 'none');
      hdrContinue && (hdrContinue.style.display = 'inline');
    } else {
      hdrLogin    && (hdrLogin.style.display    = 'inline');
      hdrSignup   && (hdrSignup.style.display   = 'inline');
      hdrContinue && (hdrContinue.style.display = 'none');
    }
  }

  // Remove reset button if present (no longer needed)
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-reset');
    if (btn) btn.style.display = 'none';
  });

  window.MyBaseCamp = { isLoggedIn };
})();
