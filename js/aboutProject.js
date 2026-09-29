// js/aboutProject.js — loads project from real API
(function () {
  const params    = new URLSearchParams(location.search);
  const projectId = params.get('id');
  const btnLogout = document.getElementById('btn-logout');

  document.querySelectorAll('[id="year"]').forEach(el => { el.textContent = new Date().getFullYear(); });

  if (!projectId) { location.href = 'main.html'; return; }

  let currentUser = null;

  async function init() {
    const res = await fetch('/me');
    if (!res.ok) { location.href = 'welcome.html'; return; }
    currentUser = await res.json();

    const pRes = await fetch(`/projects/${projectId}`);
    if (!pRes.ok) { alert('Project not found.'); location.href = 'main.html'; return; }
    const project = await pRes.json();

    // Populate page
    const titleEl = document.getElementById('project-title');
    const descEl  = document.getElementById('project-desc');
    const editBtn = document.getElementById('btn-edit-project');

    if (titleEl) titleEl.textContent = project.title || '(Untitled)';
    if (descEl)  descEl.textContent  = project.description || '';
    if (editBtn) editBtn.href = `editProject.html?id=${encodeURIComponent(project.id)}`;
  }

  btnLogout && btnLogout.addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/sign_out', { method: 'DELETE' });
    location.href = 'welcome.html';
  });

  init();
})();
