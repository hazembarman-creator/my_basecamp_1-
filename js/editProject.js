// js/editProject.js — calls PUT /projects/:id API
(function () {
  const params    = new URLSearchParams(location.search);
  const projectId = params.get('id');
  const errorEl   = document.getElementById('error');
  const successEl = document.getElementById('success');
  const btnLogout = document.getElementById('btn-logout');

  document.querySelectorAll('[id="year"]').forEach(el => { el.textContent = new Date().getFullYear(); });

  if (!projectId) { location.href = 'main.html'; return; }

  let currentUser = null;
  let project = null;

  function showError(msg)   { if (errorEl)   { errorEl.style.display   = msg ? 'block':'none'; errorEl.textContent   = msg||''; } }
  function showSuccess(msg) { if (successEl) { successEl.style.display = msg ? 'block':'none'; successEl.textContent = msg||''; } }
  function clear() { showError(''); showSuccess(''); }

  async function init() {
    // check login
    let res = await fetch('/me');
    if (!res.ok) { location.href = 'welcome.html'; return; }
    currentUser = await res.json();

    // load project
    res = await fetch(`/projects/${projectId}`);
    if (!res.ok) { alert('Project not found.'); location.href = 'main.html'; return; }
    project = await res.json();

    populate();
  }

  function populate() {
    const nameInput = document.getElementById('project-name');
    const descInput = document.getElementById('project-desc');
    const notice    = document.getElementById('notice');
    const overviewBtn = document.getElementById('btn-overview');

    if (nameInput) nameInput.value = project.title || '';
    if (descInput) descInput.value = project.description || '';
    if (overviewBtn) overviewBtn.href = `aboutProject.html?id=${encodeURIComponent(project.id)}`;

    const canEdit = currentUser.isAdmin || currentUser.id === project.ownerId;
    if (notice) notice.textContent = canEdit
      ? 'Edit project details below.'
      : 'Read-only — only the owner or admin can edit.';

    setupEvents(canEdit);
  }

  function setupEvents(canEdit) {
    const btnUpdateName = document.getElementById('btn-update-name');
    const btnUpdateDesc = document.getElementById('btn-update-desc');
    const btnDelete     = document.getElementById('btn-delete-project');

    btnLogout && btnLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      await fetch('/sign_out', { method: 'DELETE' });
      location.href = 'welcome.html';
    });

    btnUpdateName && btnUpdateName.addEventListener('click', async (e) => {
      e.preventDefault(); clear();
      if (!canEdit) return showError('No permission.');
      const title = document.getElementById('project-name').value.trim();
      if (!title) return showError('Name cannot be empty.');
      const res = await fetch(`/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) return showError(data.error || 'Update failed.');
      project = data;
      showSuccess('Project name updated.');
    });

    btnUpdateDesc && btnUpdateDesc.addEventListener('click', async (e) => {
      e.preventDefault(); clear();
      if (!canEdit) return showError('No permission.');
      const description = document.getElementById('project-desc').value.trim();
      const res = await fetch(`/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) return showError(data.error || 'Update failed.');
      project = data;
      showSuccess('Description updated.');
    });

    btnDelete && btnDelete.addEventListener('click', async (e) => {
      e.preventDefault(); clear();
      if (!canEdit) return showError('No permission.');
      if (!confirm(`Delete project "${project.title}"? This cannot be undone.`)) return;
      const res = await fetch(`/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess('Project deleted. Redirecting…');
        setTimeout(() => { location.href = 'main.html'; }, 800);
      } else {
        const data = await res.json();
        showError(data.error || 'Delete failed.');
      }
    });
  }

  init();
})();
