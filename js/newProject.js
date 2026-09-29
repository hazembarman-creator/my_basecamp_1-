// js/newProject.js — calls POST /projects API
(function () {
  const form        = document.getElementById('project-form');
  const titleInput  = document.getElementById('title');
  const descInput   = document.getElementById('description');
  const errorEl     = document.getElementById('error');
  const createdBox  = document.getElementById('created-box');
  const createdMsg  = document.getElementById('created-message');
  const openBtn     = document.getElementById('open-project');
  const btnLogout   = document.getElementById('btn-logout');

  document.querySelectorAll('[id="year"]').forEach(el => { el.textContent = new Date().getFullYear(); });

  function showError(msg) {
    if (!errorEl) return;
    errorEl.style.display = msg ? 'block' : 'none';
    errorEl.textContent = msg || '';
  }

  // check login
  (async function () {
    const res = await fetch('/me');
    if (!res.ok) { location.href = 'welcome.html'; }
  })();

  btnLogout && btnLogout.addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/sign_out', { method: 'DELETE' });
    location.href = 'welcome.html';
  });

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    const title = titleInput.value.trim();
    const description = descInput ? descInput.value.trim() : '';
    if (!title) return showError('Project name is required.');

    try {
      const res = await fetch('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (!res.ok) return showError(data.error || 'Failed to create project.');

      if (createdMsg) createdMsg.textContent = `Project "${data.title}" created!`;
      if (openBtn) openBtn.href = `aboutProject.html?id=${encodeURIComponent(data.id)}`;
      if (createdBox) createdBox.style.display = 'block';
      form.reset();
    } catch (err) {
      showError('Network error. Please try again.');
    }
  });
})();
