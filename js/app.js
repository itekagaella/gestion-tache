let currentFilter = 'all';
let currentUser = null;
let realtimeChannel = null;

// ===== CLOCK =====
function startClock() {
  function tick() {
    const now = new Date();
    const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const el = document.getElementById('clock-time');
    const dateEl = document.getElementById('dashboard-date');
    if (el) el.textContent = time;
    if (dateEl) dateEl.textContent = date.charAt(0).toUpperCase() + date.slice(1);
  }
  tick();
  setInterval(tick, 10000);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon apres-midi';
  return 'Bonsoir';
}

// ===== ANIMATED COUNTERS =====
function animateCounter(el, from, to, duration) {
  if (from === to) return;
  const start = performance.now();
  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

let prevStats = { total: 0, active: 0, done: 0 };

function updateStats(total, active, done) {
  const elTotal = document.getElementById('stat-total');
  const elActive = document.getElementById('stat-active');
  const elDone = document.getElementById('stat-done');

  animateCounter(elTotal, prevStats.total, total, 400);
  animateCounter(elActive, prevStats.active, active, 400);
  animateCounter(elDone, prevStats.done, done, 400);

  prevStats = { total, active, done };

  const max = Math.max(total, 1);
  const barTotal = document.getElementById('bar-total');
  const barActive = document.getElementById('bar-active');
  const barDone = document.getElementById('bar-done');
  if (barTotal) barTotal.style.width = '100%';
  if (barActive) barActive.style.width = Math.round((active / max) * 100) + '%';
  if (barDone) barDone.style.width = Math.round((done / max) * 100) + '%';
}

// ===== TASKS CRUD =====
async function fetchTasks(userId, filter) {
  let query = supabaseClient
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (filter === 'active') query = query.eq('completed', false);
  if (filter === 'done') query = query.eq('completed', true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function addTask(userId, title, tag) {
  const { data, error } = await supabaseClient
    .from('tasks')
    .insert([{ user_id: userId, title, tag, completed: false }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function toggleTask(id, completed) {
  const { error } = await supabaseClient
    .from('tasks')
    .update({ completed })
    .eq('id', id);
  if (error) throw error;
}

async function deleteTask(id) {
  const { error } = await supabaseClient
    .from('tasks')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ===== RENDER =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'A l\'instant';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'min';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function renderTasks(tasks, container) {
  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-pulse"></div>
        <h3>Aucune tache</h3>
        <p>Commencez par ajouter une tache ci-dessus</p>
      </div>`;
    return;
  }

  container.innerHTML = tasks.map((task, i) => `
    <div class="task-item task-enter" data-id="${task.id}" style="animation-delay: ${i * 0.03}s">
      <button class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="handleToggle('${task.id}', ${!task.completed})">
        ${task.completed ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
      </button>
      <div class="task-content">
        <div class="task-title ${task.completed ? 'done' : ''}">${escapeHtml(task.title)}</div>
        <div class="task-meta">
          <span class="task-tag tag-${task.tag || 'personal'}">${task.tag || 'personnel'}</span>
          <span class="task-date">${formatDate(task.created_at)}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn delete" onclick="handleDelete('${task.id}')">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5H12M5 3.5V2.5C5 2 5.5 1.5 6 1.5H8C8.5 1.5 9 2 9 2.5V3.5M10.5 3.5V11.5C10.5 12 10 12.5 9.5 12.5H4.5C4 12.5 3.5 12 3.5 11.5V3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

// ===== HANDLERS =====
async function handleToggle(id, completed) {
  const item = document.querySelector(`.task-item[data-id="${id}"]`);
  if (item) item.classList.add('task-toggle');
  await toggleTask(id, completed);
  setTimeout(() => refreshTasks(), 200);
}

async function handleDelete(id) {
  const item = document.querySelector(`.task-item[data-id="${id}"]`);
  if (item) {
    item.classList.add('task-exit');
    await new Promise(r => setTimeout(r, 250));
  }
  await deleteTask(id);
  showToast('Tache supprimee');
  await refreshTasks();
}

async function handleAddTask(e) {
  e.preventDefault();
  const input = document.getElementById('task-input');
  const select = document.getElementById('task-tag');
  const title = input.value.trim();
  if (!title) return;

  const btn = document.querySelector('.add-task-card .btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  await addTask(currentUser.id, title, select.value);
  input.value = '';
  btn.disabled = false;
  btn.textContent = 'Ajouter';
  showToast('Tache ajoutee');
  await refreshTasks();
}

// ===== REFRESH =====
async function refreshTasks() {
  const [tasks, total, active, done] = await Promise.all([
    fetchTasks(currentUser.id, currentFilter),
    fetchTasks(currentUser.id, 'all'),
    fetchTasks(currentUser.id, 'active'),
    fetchTasks(currentUser.id, 'done'),
  ]);

  updateStats(total.length, active.length, done.length);
  renderTasks(tasks, document.getElementById('task-list'));
}

// ===== REALTIME =====
function subscribeRealtime() {
  realtimeChannel = supabaseClient
    .channel('tasks-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${currentUser.id}`,
      },
      () => {
        refreshTasks();
      }
    )
    .subscribe();
}

// ===== FILTERS =====
function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`filter-${f}`).classList.add('active');
  refreshTasks();
}

// ===== LOGOUT =====
async function handleLogout() {
  if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);
  await signOut();
  window.location.href = 'login.html';
}

// ===== INIT =====
async function initDashboard() {
  currentUser = await requireAuth();
  if (!currentUser) return;

  const name = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
  document.getElementById('user-name').textContent = name;
  document.getElementById('user-email').textContent = currentUser.email;
  document.getElementById('user-avatar').textContent = name.charAt(0).toUpperCase();
  document.getElementById('page-title').textContent = `${getGreeting()}, ${name}`;

  document.getElementById('filter-all').addEventListener('click', () => setFilter('all'));
  document.getElementById('filter-active').addEventListener('click', () => setFilter('active'));
  document.getElementById('filter-done').addEventListener('click', () => setFilter('done'));
  document.getElementById('add-task-form').addEventListener('submit', handleAddTask);

  startClock();
  await refreshTasks();
  subscribeRealtime();
}
