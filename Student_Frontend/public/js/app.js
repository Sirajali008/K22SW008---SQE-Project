import { StudentApi, ApiError } from './api.js';

/* ---------- State ---------- */
const PAGE_SIZE = 10;
const state = {
  students: [],
  search: '',
  department: '',
  semester: '',
  sortKey: 'id',
  sortDir: 'asc',
  page: 1,
  editingId: null,
  viewingId: null,
  pendingDeleteId: null,
  saving: false,
};

/* ---------- DOM helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  tbody: $('#tableBody'),
  emptyState: $('#emptyState'),
  emptyTitle: $('#emptyTitle'),
  emptyText: $('#emptyText'),
  pageInfo: $('#pageInfo'),
  prevPage: $('#prevPage'),
  nextPage: $('#nextPage'),
  search: $('#searchInput'),
  deptFilter: $('#deptFilter'),
  semFilter: $('#semFilter'),
  refresh: $('#refreshBtn'),
  add: $('#addBtn'),
  banner: $('#errorBanner'),
  status: $('#connectionStatus'),
  statTotal: $('#statTotal'),
  statDepts: $('#statDepts'),
  statAvg: $('#statAvg'),
  themeToggle: $('#themeToggle'),
  studentDialog: $('#studentDialog'),
  studentForm: $('#studentForm'),
  dialogTitle: $('#dialogTitle'),
  formError: $('#formError'),
  saveBtn: $('#saveBtn'),
  deptList: $('#deptList'),
  detailDialog: $('#detailDialog'),
  detailName: $('#detailName'),
  detailRoll: $('#detailRoll'),
  detailDept: $('#detailDept'),
  detailSem: $('#detailSem'),
  detailId: $('#detailId'),
  detailAvatar: $('#detailAvatar'),
  detailEdit: $('#detailEdit'),
  detailDelete: $('#detailDelete'),
  confirmDialog: $('#confirmDialog'),
  confirmText: $('#confirmText'),
  confirmDelete: $('#confirmDelete'),
  toasts: $('#toasts'),
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return letters.toUpperCase();
}

function avatarColor(text) {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360}, 65%, 52%)`;
}

function avatarHtml(name, extraClass = '') {
  return `<span class="avatar ${extraClass}" style="background:${avatarColor(name)}">${escapeHtml(initials(name))}</span>`;
}

function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  els.toasts.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function showBanner(message) {
  els.banner.textContent = message;
  els.banner.hidden = false;
}

function hideBanner() {
  els.banner.hidden = true;
}

function setConnection(status) {
  const map = {
    ok: ['API connected', 'status-ok'],
    error: ['API offline', 'status-error'],
    pending: ['Connecting…', 'status-pending'],
  };
  const [text, cls] = map[status];
  els.status.textContent = text;
  els.status.className = `status-pill ${cls}`;
}

/* ---------- Derived data ---------- */
function getVisibleStudents() {
  const q = state.search.trim().toLowerCase();

  const filtered = state.students.filter((s) => {
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.rollNo.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q);
    const matchesDept = !state.department || s.department === state.department;
    const matchesSem = !state.semester || String(s.semester) === state.semester;
    return matchesSearch && matchesDept && matchesSem;
  });

  const dir = state.sortDir === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    const va = a[state.sortKey];
    const vb = b[state.sortKey];
    if (typeof va === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb), undefined, { sensitivity: 'base', numeric: true }) * dir;
  });
  return filtered;
}

/* ---------- Rendering ---------- */
function renderStats() {
  const total = state.students.length;
  const departments = new Set(state.students.map((s) => s.department));
  const avgSem = total ? state.students.reduce((sum, s) => sum + s.semester, 0) / total : null;

  els.statTotal.textContent = total;
  els.statDepts.textContent = departments.size;
  els.statAvg.textContent = avgSem === null ? '–' : avgSem.toFixed(1);
}

function renderDepartmentOptions() {
  const current = state.department;
  const departments = [...new Set(state.students.map((s) => s.department))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  els.deptFilter.innerHTML =
    '<option value="">All departments</option>' +
    departments.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  els.deptFilter.value = departments.includes(current) ? current : '';
  state.department = els.deptFilter.value;

  els.deptList.innerHTML = departments.map((d) => `<option value="${escapeHtml(d)}"></option>`).join('');
}

function renderSortIndicators() {
  $$('.sort-btn').forEach((btn) => {
    const active = btn.dataset.sort === state.sortKey;
    btn.classList.toggle('active', active);
    btn.querySelector('.sort-icon').textContent = active ? (state.sortDir === 'asc' ? '▲' : '▼') : '↕';
  });
}

function renderTable() {
  const visible = getVisibleStudents();
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  state.page = Math.min(Math.max(1, state.page), totalPages);

  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = visible.slice(start, start + PAGE_SIZE);

  els.tbody.innerHTML = pageItems
    .map(
      (s) => `
      <tr class="clickable" data-id="${s.id}">
        <td>
          <div class="name-cell">
            ${avatarHtml(s.name)}
            <span class="name-text">${escapeHtml(s.name)}</span>
          </div>
        </td>
        <td><span class="roll-badge">${escapeHtml(s.rollNo)}</span></td>
        <td><span class="dept-pill">${escapeHtml(s.department)}</span></td>
        <td><span class="sem-pill">Sem ${s.semester}</span></td>
        <td class="actions-cell">
          <button class="action-btn" data-action="edit" data-id="${s.id}" type="button">Edit</button>
          <button class="action-btn danger" data-action="delete" data-id="${s.id}" type="button">Delete</button>
        </td>
      </tr>`
    )
    .join('');

  const isFiltering = state.search || state.department || state.semester;
  els.emptyState.hidden = visible.length > 0;
  if (visible.length === 0) {
    if (state.students.length === 0) {
      els.emptyTitle.textContent = 'No students yet';
      els.emptyText.textContent = 'Add your first student to get started.';
    } else if (isFiltering) {
      els.emptyTitle.textContent = 'No matching students';
      els.emptyText.textContent = 'Try a different search term or clear the filters.';
    }
  }

  const from = visible.length ? start + 1 : 0;
  const to = start + pageItems.length;
  els.pageInfo.textContent = `Showing ${from}–${to} of ${visible.length}`;
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = state.page >= totalPages;

  renderSortIndicators();
}

function renderLoadingRows() {
  els.tbody.innerHTML = Array.from({ length: 5 })
    .map(
      () => `
      <tr class="row-skeleton">
        <td><div class="skeleton" style="width:60%"></div></td>
        <td><div class="skeleton" style="width:50%"></div></td>
        <td><div class="skeleton" style="width:70%"></div></td>
        <td><div class="skeleton" style="width:40%"></div></td>
        <td><div class="skeleton" style="width:30%;margin-left:auto"></div></td>
      </tr>`
    )
    .join('');
}

function renderAll() {
  renderStats();
  renderDepartmentOptions();
  renderTable();
}

/* ---------- Data loading ---------- */
async function loadStudents({ silent = false } = {}) {
  if (!silent) renderLoadingRows();
  try {
    state.students = await StudentApi.list();
    hideBanner();
    setConnection('ok');
  } catch (err) {
    setConnection('error');
    showBanner(err.message);
    state.students = [];
  }
  renderAll();
}

/* ---------- Add / Edit ---------- */
const RULES = {
  name: { max: 100, label: 'Full name' },
  rollNo: { max: 32, label: 'Roll number' },
  department: { max: 100, label: 'Department' },
};

function clearFormErrors() {
  els.studentForm.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
  els.studentForm.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
  els.formError.hidden = true;
}

function setFieldError(field, message) {
  const input = els.studentForm.elements[field];
  const errorEl = els.studentForm.querySelector(`[data-error="${field}"]`);
  if (errorEl) errorEl.textContent = message;
  if (input) input.classList.add('invalid');
}

function readForm() {
  const form = els.studentForm.elements;
  return {
    name: form.name.value.trim(),
    rollNo: form.rollNo.value.trim(),
    department: form.department.value.trim(),
    semester: form.semester.value === '' ? '' : Number(form.semester.value),
  };
}

function validate(data) {
  const errors = {};
  for (const [field, rule] of Object.entries(RULES)) {
    if (!data[field]) errors[field] = `${rule.label} is required.`;
    else if (data[field].length > rule.max) errors[field] = `${rule.label} must be ${rule.max} characters or fewer.`;
  }
  if (data.semester === '' || !Number.isInteger(data.semester) || data.semester < 1 || data.semester > 8) {
    errors.semester = 'Select a semester from 1 to 8.';
  }
  return errors;
}

function openStudentForm(student = null) {
  clearFormErrors();
  state.editingId = student ? student.id : null;
  els.dialogTitle.textContent = student ? 'Edit student' : 'Add student';
  els.saveBtn.textContent = student ? 'Save changes' : 'Add student';

  const form = els.studentForm.elements;
  form.name.value = student?.name ?? '';
  form.rollNo.value = student?.rollNo ?? '';
  form.department.value = student?.department ?? '';
  form.semester.value = student ? String(student.semester) : '';

  els.studentDialog.showModal();
  form.name.focus();
}

async function handleFormSubmit(event) {
  event.preventDefault();
  if (state.saving) return;

  clearFormErrors();
  const data = readForm();
  const errors = validate(data);
  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([field, msg]) => setFieldError(field, msg));
    const firstInvalid = els.studentForm.querySelector('.invalid');
    firstInvalid?.focus();
    return;
  }

  state.saving = true;
  els.saveBtn.disabled = true;
  els.saveBtn.textContent = 'Saving…';

  try {
    if (state.editingId) {
      await StudentApi.update(state.editingId, data);
      toast('Student updated successfully.');
    } else {
      await StudentApi.create(data);
      toast('Student added successfully.');
    }
    els.studentDialog.close();
    await loadStudents({ silent: true });
  } catch (err) {
    if (err.status === 409) {
      setFieldError('rollNo', 'This roll number is already in use.');
      els.studentForm.elements.rollNo.focus();
    } else if (err.status === 0) {
      els.formError.textContent = err.message;
      els.formError.hidden = false;
    } else {
      els.formError.textContent = err.message;
      els.formError.hidden = false;
    }
  } finally {
    state.saving = false;
    els.saveBtn.disabled = false;
    els.saveBtn.textContent = state.editingId ? 'Save changes' : 'Add student';
  }
}

/* ---------- Details ---------- */
async function openDetails(id) {
  state.viewingId = id;
  try {
    const student = await StudentApi.get(id);
    els.detailName.textContent = student.name;
    els.detailRoll.textContent = student.rollNo;
    els.detailDept.textContent = student.department;
    els.detailSem.textContent = `Semester ${student.semester}`;
    els.detailId.textContent = `#${student.id}`;
    els.detailAvatar.textContent = initials(student.name);
    els.detailAvatar.style.background = avatarColor(student.name);
    els.detailDialog.showModal();
  } catch (err) {
    if (err.status === 404) {
      toast('This student no longer exists.', 'error');
      await loadStudents({ silent: true });
    } else {
      toast(err.message, 'error');
    }
  }
}

/* ---------- Delete ---------- */
function askDelete(id) {
  const student = state.students.find((s) => s.id === id);
  state.pendingDeleteId = id;
  els.confirmText.textContent = student
    ? `"${student.name}" (${student.rollNo}) will be permanently removed. This cannot be undone.`
    : 'This student will be permanently removed. This cannot be undone.';
  els.confirmDialog.showModal();
}

async function confirmDelete() {
  const id = state.pendingDeleteId;
  if (!id) return;
  els.confirmDelete.disabled = true;
  try {
    await StudentApi.remove(id);
    toast('Student deleted.');
    els.confirmDialog.close();
    if (els.detailDialog.open) els.detailDialog.close();
    state.students = state.students.filter((s) => s.id !== id);
    renderAll();
  } catch (err) {
    if (err.status === 404) {
      toast('Student was already deleted.', 'info');
      els.confirmDialog.close();
      await loadStudents({ silent: true });
    } else {
      toast(err.message, 'error');
    }
  } finally {
    els.confirmDelete.disabled = false;
    state.pendingDeleteId = null;
  }
}

/* ---------- Events ---------- */
function bindEvents() {
  els.search.addEventListener('input', (e) => {
    state.search = e.target.value;
    state.page = 1;
    renderTable();
  });

  els.deptFilter.addEventListener('change', (e) => {
    state.department = e.target.value;
    state.page = 1;
    renderTable();
  });

  els.semFilter.addEventListener('change', (e) => {
    state.semester = e.target.value;
    state.page = 1;
    renderTable();
  });

  $$('.sort-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      const key = btn.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        state.sortDir = 'asc';
      }
      renderTable();
    })
  );

  els.tbody.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const id = Number(actionBtn.dataset.id);
      if (actionBtn.dataset.action === 'edit') {
        const student = state.students.find((s) => s.id === id);
        if (student) openStudentForm(student);
      } else if (actionBtn.dataset.action === 'delete') {
        askDelete(id);
      }
      return;
    }
    const row = e.target.closest('tr[data-id]');
    if (row) openDetails(Number(row.dataset.id));
  });

  els.prevPage.addEventListener('click', () => {
    state.page -= 1;
    renderTable();
  });

  els.nextPage.addEventListener('click', () => {
    state.page += 1;
    renderTable();
  });

  els.add.addEventListener('click', () => openStudentForm());
  els.refresh.addEventListener('click', () => loadStudents());

  els.studentForm.addEventListener('submit', handleFormSubmit);

  els.detailEdit.addEventListener('click', () => {
    const student = state.students.find((s) => s.id === state.viewingId);
    els.detailDialog.close();
    if (student) openStudentForm(student);
    else loadStudents({ silent: true });
  });

  els.detailDelete.addEventListener('click', () => askDelete(state.viewingId));
  els.confirmDelete.addEventListener('click', confirmDelete);

  $$('[data-close]').forEach((btn) =>
    btn.addEventListener('click', () => btn.closest('dialog').close())
  );

  // Close dialogs on backdrop click
  $$('dialog').forEach((dialog) =>
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    })
  );

  els.studentForm.addEventListener('input', (e) => {
    const field = e.target.name;
    if (!field) return;
    e.target.classList.remove('invalid');
    const errorEl = els.studentForm.querySelector(`[data-error="${field}"]`);
    if (errorEl) errorEl.textContent = '';
  });

  els.themeToggle.addEventListener('click', toggleTheme);
}

/* ---------- Theme ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  els.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('student-hub-theme', next);
}

function initTheme() {
  const saved = localStorage.getItem('student-hub-theme');
  const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (preferDark ? 'dark' : 'light'));
}

/* ---------- Init ---------- */
function init() {
  initTheme();
  bindEvents();
  setConnection('pending');
  loadStudents();
}

init();
