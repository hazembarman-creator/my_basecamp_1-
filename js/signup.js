// js/signup.js — calls POST /users API
(function () {
  const form  = document.getElementById('signup-form');
  const errEl = document.getElementById('error');

  function showError(msg) {
    if (!errEl) return;
    errEl.style.display = msg ? 'block' : 'none';
    errEl.textContent = msg || '';
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');

    const username  = (form.name    || form.username) ? (form.name?.value || form.username?.value || '').trim() : '';
    const email     = form.email.value.trim().toLowerCase();
    const password  = form.password.value;
    const password2 = form.password2 ? form.password2.value : password;

    if (!username) return showError('Name is required.');
    if (!email)    return showError('Email is required.');
    if (password.length < 6) return showError('Password must be at least 6 characters.');
    if (password !== password2) return showError('Passwords do not match.');

    try {
      const res = await fetch('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) return showError(data.error || 'Signup failed.');
      location.href = 'main.html';
    } catch (err) {
      showError('Network error. Please try again.');
    }
  });
})();
