// ═══════════════════════════════════════════════════════════
// Job Application Tracker — Client-Side Application
// ═══════════════════════════════════════════════════════════

const API_BASE = '/api';

// ─── State ──────────────────────────────────────────────
let state = {
    token: localStorage.getItem('jt_token'),
    user: JSON.parse(localStorage.getItem('jt_user') || 'null'),
    jobs: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    filters: { search: '', status: '' },
};

// ─── API Helper ─────────────────────────────────────────
async function api(endpoint, options = {}) {
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    };

    if (state.token) {
        config.headers['Authorization'] = `Bearer ${state.token}`;
    }

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401) {
            logout();
        }
        throw new Error(data.error || data.details?.map(d => d.message).join(', ') || 'Something went wrong');
    }

    return data;
}

// ─── Toast Notifications ────────────────────────────────
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    const colors = {
        success: 'border-l-4 border-emerald-500',
        error: 'border-l-4 border-red-500',
        info: 'border-l-4 border-indigo-500',
    };
    const icons = { success: '✓', error: '✕', info: 'ℹ' };

    toast.className = `toast-enter bg-white rounded-lg shadow-xl px-5 py-3.5 flex items-center gap-3 text-sm text-gray-700 min-w-[280px] max-w-[400px] border border-gray-100 ${colors[type] || colors.info}`;

    toast.innerHTML = `
    <span class="font-bold text-base">${icons[type] || 'ℹ'}</span>
    <span class="flex-1">${message}</span>
    <button class="text-gray-400 hover:text-gray-600 text-lg leading-none ml-2" onclick="this.parentElement.remove()">&times;</button>
  `;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ─── Auth Functions ─────────────────────────────────────
function setAuth(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem('jt_token', token);
    localStorage.setItem('jt_user', JSON.stringify(user));
}

function clearAuth() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('jt_token');
    localStorage.removeItem('jt_user');
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('register-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating...';

    try {
        const data = await api('/auth/register', {
            method: 'POST',
            body: {
                username: document.getElementById('register-username').value.trim(),
                email: document.getElementById('register-email').value.trim(),
                password: document.getElementById('register-password').value,
            },
        });

        setAuth(data.data.token, data.data.user);
        showToast(`Welcome, ${data.data.user.username}! 🎉`, 'success');
        showDashboard();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Create Account';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in...';

    try {
        const data = await api('/auth/login', {
            method: 'POST',
            body: {
                email: document.getElementById('login-email').value.trim(),
                password: document.getElementById('login-password').value,
            },
        });

        setAuth(data.data.token, data.data.user);
        showToast(`Welcome back, ${data.data.user.username}! 👋`, 'success');
        showDashboard();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Sign In';
    }
}

async function logout() {
    try {
        if (state.token) {
            await api('/auth/logout', { method: 'POST' });
        }
    } catch (_) { }
    clearAuth();
    showAuthSection();
    showToast('Logged out successfully', 'info');
}

// ─── View Switching ─────────────────────────────────────
function showAuthSection() {
    document.getElementById('auth-section').style.display = 'flex';
    document.getElementById('dashboard-section').style.display = 'none';
}

function showDashboard() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    updateNavbar();
    loadStats();
    loadJobs();
}

function updateNavbar() {
    if (state.user) {
        document.getElementById('navbar-username').textContent = state.user.username;
        document.getElementById('navbar-avatar').textContent = state.user.username.charAt(0).toUpperCase();
    }
}

// ─── Stats ──────────────────────────────────────────────
async function loadStats() {
    try {
        const data = await api('/auth/me');
        const stats = data.data.stats;
        document.getElementById('stat-total').textContent = stats.total_jobs || 0;
        document.getElementById('stat-applied').textContent = stats.applied || 0;
        document.getElementById('stat-interview').textContent = stats.interviews || 0;
        document.getElementById('stat-offer').textContent = stats.offers || 0;
        document.getElementById('stat-rejected').textContent = stats.rejected || 0;
        document.getElementById('stat-accepted').textContent = stats.accepted || 0;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// ─── Jobs CRUD ──────────────────────────────────────────
async function loadJobs() {
    try {
        const params = new URLSearchParams({
            page: state.pagination.page,
            limit: state.pagination.limit,
        });
        if (state.filters.search) params.set('search', state.filters.search);
        if (state.filters.status) params.set('status', state.filters.status);

        const data = await api(`/jobs?${params.toString()}`);
        state.jobs = data.data;
        state.pagination = data.pagination;
        renderJobs();
        renderPagination();
    } catch (error) {
        showToast('Failed to load jobs', 'error');
    }
}

function renderJobs() {
    const grid = document.getElementById('jobs-grid');
    const emptyState = document.getElementById('empty-state');

    if (state.jobs.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    grid.innerHTML = state.jobs.map(job => `
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden animate-fadeIn relative group">
      <div class="job-card-bar bar-${job.status}"></div>
      <div class="p-5">
        <!-- Header -->
        <div class="flex items-start justify-between mb-3">
          <div class="min-w-0 flex-1">
            <h3 class="text-base font-bold text-gray-900 truncate">${escapeHtml(job.company)}</h3>
            <p class="text-sm text-gray-500 mt-0.5 truncate">${escapeHtml(job.position)}</p>
          </div>
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <button onclick="openEditModal(${job.id})" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition" title="Edit">✏️</button>
            <button onclick="openDeleteModal(${job.id})" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition" title="Delete">🗑️</button>
          </div>
        </div>

        <!-- Meta Tags -->
        <div class="flex flex-wrap gap-2 mb-3">
          ${job.location ? `<span class="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">📍 ${escapeHtml(job.location)}</span>` : ''}
          <span class="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">${formatJobType(job.job_type)}</span>
          ${job.salary_min || job.salary_max ? `<span class="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full font-medium">💰 ${formatSalary(job.salary_min, job.salary_max)}</span>` : ''}
          ${job.url ? `<a href="${escapeHtml(job.url)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs text-indigo-500 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition">🔗 Link</a>` : ''}
        </div>

        ${job.notes ? `<p class="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50 line-clamp-2">${escapeHtml(job.notes)}</p>` : ''}

        <!-- Footer -->
        <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
          <button onclick="openStatusModal(${job.id}, '${job.status}')" class="${getStatusClasses(job.status)} inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition hover:scale-105 cursor-pointer border">
            ${formatStatus(job.status)}
          </button>
          <span class="text-[11px] text-gray-400">
            ${job.applied_date ? formatDate(job.applied_date) : formatDate(job.created_at)}
          </span>
        </div>
      </div>
    </div>
  `).join('');
}

function getStatusClasses(status) {
    const map = {
        wishlist: 'bg-purple-50 text-purple-600 border-purple-200',
        applied: 'bg-blue-50 text-blue-600 border-blue-200',
        phone_screen: 'bg-cyan-50 text-cyan-600 border-cyan-200',
        interview: 'bg-amber-50 text-amber-600 border-amber-200',
        offer: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        rejected: 'bg-red-50 text-red-600 border-red-200',
        withdrawn: 'bg-gray-100 text-gray-500 border-gray-200',
        accepted: 'bg-green-50 text-green-600 border-green-200',
    };
    return map[status] || map.applied;
}

function renderPagination() {
    const pag = document.getElementById('pagination');
    const { page, pages, total } = state.pagination;
    if (pages <= 1) { pag.style.display = 'none'; return; }
    pag.style.display = 'flex';
    document.getElementById('page-info').textContent = `Page ${page} of ${pages} (${total} total)`;
    document.getElementById('prev-btn').disabled = page <= 1;
    document.getElementById('next-btn').disabled = page >= pages;
}

// ─── Create/Edit Modal ──────────────────────────────────
function openCreateModal() {
    document.getElementById('modal-title').textContent = 'Add Application';
    document.getElementById('job-form').reset();
    document.getElementById('job-id').value = '';
    document.getElementById('job-status').value = 'applied';
    document.getElementById('job-type').value = 'full-time';
    document.getElementById('modal-save-btn').textContent = 'Save Application';
    toggleModal('job-modal-overlay', true);
}

async function openEditModal(jobId) {
    try {
        const data = await api(`/jobs/${jobId}`);
        const job = data.data;
        document.getElementById('modal-title').textContent = 'Edit Application';
        document.getElementById('job-id').value = job.id;
        document.getElementById('job-company').value = job.company || '';
        document.getElementById('job-position').value = job.position || '';
        document.getElementById('job-status').value = job.status || 'applied';
        document.getElementById('job-type').value = job.job_type || 'full-time';
        document.getElementById('job-location').value = job.location || '';
        document.getElementById('job-salary-min').value = job.salary_min || '';
        document.getElementById('job-salary-max').value = job.salary_max || '';
        document.getElementById('job-applied-date').value = job.applied_date ? job.applied_date.split('T')[0] : '';
        document.getElementById('job-deadline').value = job.deadline ? job.deadline.split('T')[0] : '';
        document.getElementById('job-url').value = job.url || '';
        document.getElementById('job-notes').value = job.notes || '';
        document.getElementById('modal-save-btn').textContent = 'Update Application';
        toggleModal('job-modal-overlay', true);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleJobSave() {
    const jobId = document.getElementById('job-id').value;
    const btn = document.getElementById('modal-save-btn');
    btn.disabled = true;

    const body = {
        company: document.getElementById('job-company').value.trim(),
        position: document.getElementById('job-position').value.trim(),
        status: document.getElementById('job-status').value,
        job_type: document.getElementById('job-type').value,
        location: document.getElementById('job-location').value.trim() || null,
        salary_min: parseInt(document.getElementById('job-salary-min').value) || null,
        salary_max: parseInt(document.getElementById('job-salary-max').value) || null,
        applied_date: document.getElementById('job-applied-date').value || null,
        deadline: document.getElementById('job-deadline').value || null,
        url: document.getElementById('job-url').value.trim() || null,
        notes: document.getElementById('job-notes').value.trim() || null,
    };

    try {
        if (jobId) {
            await api(`/jobs/${jobId}`, { method: 'PUT', body });
            showToast('Application updated! ✏️', 'success');
        } else {
            await api('/jobs', { method: 'POST', body });
            showToast('Application added! 🎉', 'success');
        }
        toggleModal('job-modal-overlay', false);
        loadJobs();
        loadStats();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

// ─── Status Modal ───────────────────────────────────────
function openStatusModal(jobId, currentStatus) {
    document.getElementById('status-job-id').value = jobId;
    document.getElementById('new-status').value = currentStatus;
    toggleModal('status-modal-overlay', true);
}

async function handleStatusSave() {
    const jobId = document.getElementById('status-job-id').value;
    const status = document.getElementById('new-status').value;
    const btn = document.getElementById('status-save-btn');
    btn.disabled = true;

    try {
        await api(`/jobs/${jobId}/status`, { method: 'PATCH', body: { status } });
        showToast(`Status updated to "${formatStatus(status)}" ✓`, 'success');
        toggleModal('status-modal-overlay', false);
        loadJobs();
        loadStats();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

// ─── Delete Modal ───────────────────────────────────────
function openDeleteModal(jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;
    document.getElementById('delete-job-id').value = jobId;
    document.getElementById('delete-company').textContent = job.company;
    document.getElementById('delete-position').textContent = job.position;
    toggleModal('delete-modal-overlay', true);
}

async function handleDelete() {
    const jobId = document.getElementById('delete-job-id').value;
    const btn = document.getElementById('delete-confirm-btn');
    btn.disabled = true;

    try {
        await api(`/jobs/${jobId}`, { method: 'DELETE' });
        showToast('Application deleted', 'info');
        toggleModal('delete-modal-overlay', false);
        loadJobs();
        loadStats();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

// ─── Modal Helpers ──────────────────────────────────────
function toggleModal(id, show) {
    const overlay = document.getElementById(id);
    if (show) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ─── Formatting Helpers ─────────────────────────────────
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatStatus(status) {
    const labels = {
        wishlist: '⭐ Wishlist',
        applied: '📤 Applied',
        phone_screen: '📞 Phone Screen',
        interview: '🎤 Interview',
        offer: '🎁 Offer',
        rejected: '❌ Rejected',
        withdrawn: '🔙 Withdrawn',
        accepted: '✅ Accepted',
    };
    return labels[status] || status;
}

function formatJobType(type) {
    const labels = {
        'full-time': '🕐 Full-Time',
        'part-time': '⏰ Part-Time',
        'contract': '📄 Contract',
        'internship': '🎓 Internship',
        'freelance': '💻 Freelance',
    };
    return labels[type] || type;
}

function formatSalary(min, max) {
    const fmt = (n) => `$${(n / 1000).toFixed(0)}k`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return `${fmt(min)}+`;
    if (max) return `Up to ${fmt(max)}`;
    return '';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
}

function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// ─── Event Listeners ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Auth tabs
    document.getElementById('login-tab-btn').addEventListener('click', () => {
        document.getElementById('login-tab-btn').classList.add('active');
        document.getElementById('register-tab-btn').classList.remove('active');
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
    });

    document.getElementById('register-tab-btn').addEventListener('click', () => {
        document.getElementById('register-tab-btn').classList.add('active');
        document.getElementById('login-tab-btn').classList.remove('active');
        document.getElementById('register-form').style.display = 'block';
        document.getElementById('login-form').style.display = 'none';
    });

    // Auth forms
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Add job buttons
    document.getElementById('add-job-btn').addEventListener('click', openCreateModal);
    document.getElementById('empty-add-btn').addEventListener('click', openCreateModal);

    // Job modal
    document.getElementById('modal-close-btn').addEventListener('click', () => toggleModal('job-modal-overlay', false));
    document.getElementById('modal-cancel-btn').addEventListener('click', () => toggleModal('job-modal-overlay', false));
    document.getElementById('modal-save-btn').addEventListener('click', handleJobSave);

    // Status modal
    document.getElementById('status-modal-close').addEventListener('click', () => toggleModal('status-modal-overlay', false));
    document.getElementById('status-cancel-btn').addEventListener('click', () => toggleModal('status-modal-overlay', false));
    document.getElementById('status-save-btn').addEventListener('click', handleStatusSave);

    // Delete modal
    document.getElementById('delete-modal-close').addEventListener('click', () => toggleModal('delete-modal-overlay', false));
    document.getElementById('delete-cancel-btn').addEventListener('click', () => toggleModal('delete-modal-overlay', false));
    document.getElementById('delete-confirm-btn').addEventListener('click', handleDelete);

    // Close modals on overlay click
    ['job-modal-overlay', 'status-modal-overlay', 'delete-modal-overlay'].forEach(id => {
        document.getElementById(id).addEventListener('click', (e) => {
            if (e.target.id === id) toggleModal(id, false);
        });
    });

    // Search
    document.getElementById('search-input').addEventListener('input', debounce((e) => {
        state.filters.search = e.target.value.trim();
        state.pagination.page = 1;
        loadJobs();
    }, 400));

    // Status filter
    document.getElementById('status-filter').addEventListener('change', (e) => {
        state.filters.status = e.target.value;
        state.pagination.page = 1;
        loadJobs();
    });

    // Pagination
    document.getElementById('prev-btn').addEventListener('click', () => {
        if (state.pagination.page > 1) { state.pagination.page--; loadJobs(); }
    });
    document.getElementById('next-btn').addEventListener('click', () => {
        if (state.pagination.page < state.pagination.pages) { state.pagination.page++; loadJobs(); }
    });

    // Escape to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            ['job-modal-overlay', 'status-modal-overlay', 'delete-modal-overlay'].forEach(id => toggleModal(id, false));
        }
    });

    // Initialize
    if (state.token && state.user) {
        showDashboard();
    } else {
        showAuthSection();
    }
});
