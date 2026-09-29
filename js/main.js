// js/main.js — loads projects from real API
(function () {
  const projectsContainer  = document.getElementById('projects-container');
  const emptyMessage       = document.getElementById('empty-message');
  const searchInput        = document.getElementById('search');
  const currentUserDisplay = document.getElementById('current-user-display');
  const btnLogout          = document.getElementById('btn-logout');
  const filterBtns         = document.querySelectorAll('.filter-btn');

  document.querySelectorAll('[id="year"]').forEach(el => { el.textContent = new Date().getFullYear(); });

  let currentUser = null;
  let allProjects = [];
  let currentFilter = 'all';
  let searchTerm = '';

  async function init() {
    // Check login
    try {
      const res = await fetch('/me');
      if (!res.ok) { location.href = 'welcome.html'; return; }
      currentUser = await res.json();
    } catch (e) { location.href = 'welcome.html'; return; }

    if (currentUserDisplay) {
      currentUserDisplay.textContent = `Signed in as ${currentUser.username}` + (currentUser.isAdmin ? ' · Admin' : '');
    }

    await loadProjects();
    setupEvents();
  }

  async function loadProjects() {
    try {
      const res = await fetch('/projects');
      if (!res.ok) return;
      allProjects = await res.json();
      renderProjects();
    } catch (e) { console.error(e); }
  }

  function renderProjects() {
    let filtered = allProjects.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (currentFilter === 'mine') {
      filtered = filtered.filter(p => p.ownerId === currentUser.id);
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        (p.title + ' ' + (p.description || '')).toLowerCase().includes(searchTerm)
      );
    }

    if (!projectsContainer) return;
    projectsContainer.innerHTML = '';

    if (filtered.length === 0) {
      if (emptyMessage) emptyMessage.style.display = 'block';
      return;
    }
    if (emptyMessage) emptyMessage.style.display = 'none';

    filtered.forEach(project => {
      projectsContainer.appendChild(createProjectCard(project));
    });
  }

  function createProjectCard(project) {
    const card = document.createElement('article');
    card.className = 'project-card';

    const title = document.createElement('h3');
    title.style.margin = '0';
    title.textContent = project.title || '(Untitled)';

    const desc = document.createElement('div');
    desc.className = 'small-muted';
    desc.textContent = project.description || '';

    const actions = document.createElement('div');
    actions.className = 'project-actions';

    const btnView = document.createElement('a');
    btnView.className = 'link';
    btnView.href = `aboutProject.html?id=${encodeURIComponent(project.id)}`;
    btnView.textContent = 'Open';

    const btnEdit = document.createElement('a');
    btnEdit.className = 'link';
    btnEdit.href = `editProject.html?id=${encodeURIComponent(project.id)}`;
    btnEdit.textContent = 'Edit';

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn';
    btnDelete.textContent = 'Delete';
    btnDelete.addEventListener('click', () => handleDelete(project));

    actions.appendChild(btnView);
    actions.appendChild(btnEdit);
    if (currentUser && (currentUser.id === project.ownerId || currentUser.isAdmin)) {
      actions.appendChild(btnDelete);
    }

    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(actions);
    return card;
  }

  async function handleDelete(project) {
    if (!confirm(`Delete project "${project.title}"?`)) return;
    try {
      const res = await fetch(`/projects/${project.id}`, { method: 'DELETE' });
      if (res.ok) await loadProjects();
    } catch (e) { console.error(e); }
  }

  function setupEvents() {
    btnLogout && btnLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!confirm('Log out?')) return;
      await fetch('/sign_out', { method: 'DELETE' });
      location.href = 'welcome.html';
    });

    filterBtns.forEach(btn => btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderProjects();
    }));

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.trim().toLowerCase();
        clearTimeout(searchInput._t);
        searchInput._t = setTimeout(renderProjects, 180);
      });
    }
  }

  init();
})();
