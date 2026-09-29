const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const SequelizeStore = require('connect-session-sequelize')(session.Store);

const app = express();
const PORT = process.env.PORT || 8080;

// ── Database ──────────────────────────────────────────────────────────────────
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'db.sqlite'),
  logging: false,
});

// ── Models ────────────────────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username:    { type: DataTypes.STRING,  allowNull: false, unique: true },
  email:       { type: DataTypes.STRING,  allowNull: false, unique: true },
  password:    { type: DataTypes.STRING,  allowNull: false },
  isAdmin:     { type: DataTypes.BOOLEAN, defaultValue: false },
});

const Project = sequelize.define('Project', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title:       { type: DataTypes.STRING,  allowNull: false },
  description: { type: DataTypes.TEXT,   defaultValue: '' },
  ownerId:     { type: DataTypes.INTEGER, allowNull: false },
});

// Session store
const sessionStore = new SequelizeStore({ db: sequelize });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'mybasecamp-secret-key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

async function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = await User.findByPk(req.session.userId);
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'Admin only' });
  req.currentUser = user;
  next();
}

// ── Helper: safe user object ──────────────────────────────────────────────────
function safeUser(u) {
  return { id: u.id, username: u.username, email: u.email, isAdmin: u.isAdmin };
}

// ═════════════════════════════════════════════════════════════════════════════
//  USER ROUTES
// ═════════════════════════════════════════════════════════════════════════════

// User #new  — signup form page
app.get('/users/new', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

// User #create — register
app.post('/users', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(422).json({ error: 'username, email and password are required' });

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(422).json({ error: 'Email already taken' });

    const existsName = await User.findOne({ where: { username } });
    if (existsName) return res.status(422).json({ error: 'Username already taken' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hash, isAdmin: false });

    // auto-login after signup
    req.session.userId = user.id;
    return res.status(201).json(safeUser(user));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// User #show — get user by id
app.get('/users/:id', requireLogin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(safeUser(user));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// User #index — list all users (admin only)
app.get('/users', requireLogin, async (req, res) => {
  try {
    const me = await User.findByPk(req.session.userId);
    if (!me || !me.isAdmin) return res.status(403).json({ error: 'Admin only' });
    const users = await User.findAll();
    return res.json(users.map(safeUser));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// User #destroy — delete user
app.delete('/users/:id', requireLogin, async (req, res) => {
  try {
    const me = await User.findByPk(req.session.userId);
    // only admin or the user themselves can delete
    if (!me) return res.status(401).json({ error: 'Not authenticated' });
    if (String(me.id) !== String(req.params.id) && !me.isAdmin)
      return res.status(403).json({ error: 'Forbidden' });

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.destroy();
    // if user deleted themselves, clear session
    if (String(me.id) === String(req.params.id)) req.session.destroy(() => {});
    return res.json({ message: 'User deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// User setAdmin — grant admin role
app.put('/users/:id/set_admin', requireLogin, async (req, res) => {
  try {
    const me = await User.findByPk(req.session.userId);
    if (!me || !me.isAdmin) return res.status(403).json({ error: 'Admin only' });

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update({ isAdmin: true });
    return res.json(safeUser(user));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// User removeAdmin — revoke admin role
app.put('/users/:id/remove_admin', requireLogin, async (req, res) => {
  try {
    const me = await User.findByPk(req.session.userId);
    if (!me || !me.isAdmin) return res.status(403).json({ error: 'Admin only' });

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update({ isAdmin: false });
    return res.json(safeUser(user));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  SESSION ROUTES
// ═════════════════════════════════════════════════════════════════════════════

// Session #sign_in page
app.get('/sign_in', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Session #sign_in — login
app.post('/sign_in', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const identifier = email || username;
    if (!identifier || !password)
      return res.status(422).json({ error: 'Email/username and password required' });

    const user = await User.findOne({
      where: identifier.includes('@')
        ? { email: identifier }
        : { username: identifier }
    });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.userId = user.id;
    return res.json(safeUser(user));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Session #sign_out — logout
app.delete('/sign_out', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Signed out' });
  });
});

// Also support POST /sign_out for HTML forms
app.post('/sign_out', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Current session user
app.get('/me', requireLogin, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId);
    if (!user) return res.status(404).json({ error: 'Not found' });
    return res.json(safeUser(user));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  PROJECT ROUTES
// ═════════════════════════════════════════════════════════════════════════════

// Project #index
app.get('/projects', requireLogin, async (req, res) => {
  try {
    const projects = await Project.findAll();
    return res.json(projects);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Project #new — new project form page
app.get('/projects/new', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'newProject.html'));
});

// Project #create
app.post('/projects', requireLogin, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(422).json({ error: 'Title is required' });

    const project = await Project.create({
      title,
      description: description || '',
      ownerId: req.session.userId,
    });
    return res.status(201).json(project);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Project #show
app.get('/projects/:id', requireLogin, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    return res.json(project);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Project #edit page
app.get('/projects/:id/edit', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'editProject.html'));
});

// Project #update
app.put('/projects/:id', requireLogin, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const me = await User.findByPk(req.session.userId);
    if (project.ownerId !== me.id && !me.isAdmin)
      return res.status(403).json({ error: 'Forbidden' });

    const { title, description } = req.body;
    await project.update({ title: title || project.title, description: description ?? project.description });
    return res.json(project);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Also support PATCH
app.patch('/projects/:id', requireLogin, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const me = await User.findByPk(req.session.userId);
    if (project.ownerId !== me.id && !me.isAdmin)
      return res.status(403).json({ error: 'Forbidden' });

    const { title, description } = req.body;
    await project.update({ title: title || project.title, description: description ?? project.description });
    return res.json(project);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Project #destroy
app.delete('/projects/:id', requireLogin, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const me = await User.findByPk(req.session.userId);
    if (project.ownerId !== me.id && !me.isAdmin)
      return res.status(403).json({ error: 'Forbidden' });

    await project.destroy();
    return res.json({ message: 'Project deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  FRONTEND ROUTES (serve HTML pages)
// ═════════════════════════════════════════════════════════════════════════════
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'welcome.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'signup.html')));
app.get('/login',  (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/main',   (req, res) => res.sendFile(path.join(__dirname, 'main.html')));

// ═════════════════════════════════════════════════════════════════════════════
//  START SERVER
// ═════════════════════════════════════════════════════════════════════════════
(async () => {
  await sequelize.sync();
  await sessionStore.sync();

  // Seed one admin if no users exist
  const count = await User.count();
  if (count === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await User.create({ username: 'admin', email: 'admin@mybasecamp.com', password: hash, isAdmin: true });
    console.log('Seeded admin user: admin / admin123');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MyBaseCamp server running on http://0.0.0.0:${PORT}`);
  });
})();
