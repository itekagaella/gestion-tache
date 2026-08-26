const GS_URL = 'https://script.google.com/macros/s/AKfycbwXSfes7lz6vTsB0N6_XNlvQkx4ZshqSSipObFJ4XRSW3TTJh18JYFtXPhWSIdTWOyb/exec';

function syncToSheet(payload) {
  fetch(GS_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(payload)
  }).catch(() => {});
}

async function fetchTasks(userId, filter = 'all') {
  let query = window._supabaseClient
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
  const { data, error } = await window._supabaseClient
    .from('tasks')
    .insert([{ user_id: userId, title, tag, completed: false }])
    .select()
    .single();
  if (error) throw error;
  syncToSheet({ action: 'add', user_email: currentUser?.email || '', title, tag, task_id: data.id });
  return data;
}

async function toggleTask(id, completed) {
  const { error } = await window._supabaseClient
    .from('tasks')
    .update({ completed })
    .eq('id', id);
  if (error) throw error;
  syncToSheet({ action: 'toggle', user_email: currentUser?.email || '', task_id: id, completed });
}

async function deleteTask(id) {
  const { error } = await window._supabaseClient
    .from('tasks')
    .delete()
    .eq('id', id);
  if (error) throw error;
  syncToSheet({ action: 'delete', user_email: currentUser?.email || '', task_id: id });
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function renderTasks(tasks, container) {
  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">&#128221;</div>
        <h3>Aucune tache</h3>
        <p>Commencez par ajouter une tache ci-dessus</p>
      </div>`;
    return;
  }

  container.innerHTML = tasks.map(task => `
    <div class="task-item" data-id="${task.id}">
      <button class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="handleToggle('${task.id}', ${!task.completed})">
        ${task.completed ? '&#10003;' : ''}
      </button>
      <div class="task-content">
        <div class="task-title ${task.completed ? 'done' : ''}">${escapeHtml(task.title)}</div>
        <div class="task-meta">
          <span class="task-tag tag-${task.tag || 'personal'}">${task.tag || 'personnel'}</span>
          <span class="task-date">${formatDate(task.created_at)}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn delete" onclick="handleDelete('${task.id}')">&#128465;</button>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let currentFilter = 'all';
let currentUser = null;

async function handleToggle(id, completed) {
  await toggleTask(id, completed);
  await refreshTasks();
}

async function handleDelete(id) {
  await deleteTask(id);
  showToast('Tache supprimee');
  await refreshTasks();
}

async function refreshTasks() {
  const tasks = await fetchTasks(currentUser.id, currentFilter);
  const total = await fetchTasks(currentUser.id, 'all');
  const active = await fetchTasks(currentUser.id, 'active');
  const done = await fetchTasks(currentUser.id, 'done');

  document.getElementById('stat-total').textContent = total.length;
  document.getElementById('stat-active').textContent = active.length;
  document.getElementById('stat-done').textContent = done.length;

  renderTasks(tasks, document.getElementById('task-list'));
}

async function handleAddTask(e) {
  e.preventDefault();
  const input = document.getElementById('task-input');
  const select = document.getElementById('task-tag');
  const title = input.value.trim();
  if (!title) return;

  await addTask(currentUser.id, title, select.value);
  input.value = '';
  showToast('Tache ajoutee');
  await refreshTasks();
}

async function initDashboard() {
  currentUser = await requireAuth();
  if (!currentUser) return;

  const name = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
  document.getElementById('user-name').textContent = name;
  document.getElementById('user-email').textContent = currentUser.email;
  document.getElementById('user-avatar').textContent = name.charAt(0).toUpperCase();
  document.getElementById('page-title').textContent = `Bonjour, ${name}`;

  document.getElementById('filter-all').addEventListener('click', () => setFilter('all'));
  document.getElementById('filter-active').addEventListener('click', () => setFilter('active'));
  document.getElementById('filter-done').addEventListener('click', () => setFilter('done'));
  document.getElementById('add-task-form').addEventListener('submit', handleAddTask);

  await refreshTasks();
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`filter-${f}`).classList.add('active');
  refreshTasks();
}

async function handleLogout() {
  await signOut();
  window.location.href = 'login.html';
}
