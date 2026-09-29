// js/login.js — calls POST /sign_in API
(function () {
  const form  = document.getElementById('login-form');
  const errEl = document.getElementById('error');

  function showError(msg) {
    if (!errEl) return;
    errEl.style.display = msg ? 'block' : 'none';
    errEl.textContent = msg || '';
  }

  // If already logged in, go to main
  (async function checkAlready() {
    try {
      const res = await fetch('/me');
      if (res.ok) location.href = 'main.html';
    } catch (e) {}
  })();

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');

    const who      = (form.who || form.email) ? (form.who?.value || form.email?.value || '').trim() : '';
    const password = form.password.value;

    if (!who)      return showError('Enter your email or username.');
    if (!password) return showError('Enter your password.');

    try {
      const res = await fetch('/sign_in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: who, password }),
      });
      const data = await res.json();
      if (!res.ok) return showError(data.error || 'Login failed.');
      location.href = 'main.html';
    } catch (err) {
      showError('Network error. Please try again.');
    }
  });
})();
