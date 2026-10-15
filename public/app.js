// Session: { token, role: 'candidate' | 'company', email, name }
const session = () => ({
  token: localStorage.getItem('token'),
  role: localStorage.getItem('role'),
  email: localStorage.getItem('email'),
  name: localStorage.getItem('name'),
});
const isCandidate = () => session().token && session().role === 'candidate';
const isCompany = () => session().token && session().role === 'company';

const api = (path, opts = {}) => {
  const { token } = session();
  const headers = { ...(opts.headers || {}) };
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(path, { ...opts, headers }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || `Request failed (${r.status})`);
    return data;
  });
};

const $ = (id) => document.getElementById(id);
const toast = (msg) => {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3500);
};
const skillList = (skills) => Array.isArray(skills) ? skills : [];

// ---------- state & bookmarks ----------
const savedJobIdsSet = new Set();
let cachedApplications = [];
let cachedSavedJobs = [];
let currentAppTab = 'all';

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatChatTime(dateString) {
  if (!dateString) return 'Just now';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'Just now';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return timeStr;
  const isThisYear = d.getFullYear() === now.getFullYear();
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(isThisYear ? {} : { year: 'numeric' }) });
  return `${dateStr}, ${timeStr}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------- navigation ----------
const NAVS = {
  public: [['#/jobs', 'Jobs']],
  candidate: [['#/dashboard', 'Dashboard'], ['#/jobs', 'Jobs'], ['#/my-applications', 'My Applications']],
  company: [['#/company/dashboard', 'Dashboard'], ['#/company/jobs', 'My Jobs'], ['#/company/applications', 'Applications'], ['#/company/jobs/create', 'Post Job']],
};
function closeAuthMenu() {
  $('authMenu')?.classList.add('hidden');
  $('authDropBtn')?.setAttribute('aria-expanded', 'false');
}
function closeUserMenu() {
  $('userMenu')?.classList.add('hidden');
  $('userBadgeBtn')?.setAttribute('aria-expanded', 'false');
}
function renderNav() {
  const role = isCompany() ? 'company' : isCandidate() ? 'candidate' : 'public';
  closeMobileMenu();
  closeAuthMenu();
  closeUserMenu();
  $('mainNav').innerHTML = NAVS[role].map(([h, l]) => `<a class="nav-btn" href="${h}">${l}</a>`).join('');
  const { token, email, name } = session();
  const loggedOut = !token;
  $('authDropdown')?.classList.toggle('hidden', !loggedOut);

  // User Section Dropdown (Profile + Logout)
  const userWrap = $('userDropdownWrap');
  if (userWrap) {
    userWrap.classList.toggle('hidden', loggedOut);
    if (token) {
      const isComp = role === 'company';
      const displayName = name || email || (isComp ? 'Company' : 'Candidate');
      if ($('userAvatarBadge')) $('userAvatarBadge').textContent = isComp ? '🏢' : '👤';
      if ($('userNameLabel')) $('userNameLabel').textContent = displayName;
      if ($('userMenuAvatar')) $('userMenuAvatar').textContent = isComp ? '🏢' : '👤';
      if ($('userMenuName')) $('userMenuName').textContent = displayName;
      if ($('userMenuEmail')) $('userMenuEmail').textContent = email || '';
      if ($('userMenuRoleBadge')) $('userMenuRoleBadge').textContent = isComp ? 'Company Partner' : 'Verified Candidate';
      if ($('userMenuProfileLink')) $('userMenuProfileLink').classList.toggle('hidden', isComp);
      if ($('userMenuSavedLink')) $('userMenuSavedLink').classList.toggle('hidden', isComp);
      if ($('userMenuDashLink')) $('userMenuDashLink').classList.toggle('hidden', !isComp);
    }
  }

  // Notification & Message toggles
  $('notifToggleBtn')?.classList.toggle('hidden', loggedOut);
  $('msgToggleBtn')?.classList.toggle('hidden', loggedOut);

  if (loggedOut) {
    $('notifDropdown')?.classList.add('hidden');
    $('chatModal')?.classList.add('hidden');
    savedJobIdsSet.clear();
  } else {
    loadNotifications();
    loadConversations();
    if (isCandidate()) fetchSavedJobIds();
  }
}
$('authDropBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  closeUserMenu();
  const open = $('authMenu').classList.toggle('hidden');
  $('authDropBtn').setAttribute('aria-expanded', String(!open));
});
$('userBadgeBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  closeAuthMenu();
  const open = $('userMenu').classList.toggle('hidden');
  $('userBadgeBtn').setAttribute('aria-expanded', String(!open));
});
$('userMenu')?.addEventListener('click', (e) => {
  if (e.target.closest('a')) closeUserMenu();
});
document.addEventListener('click', (e) => {
  if (!$('authMenu')?.classList.contains('hidden') && !$('authDropdown')?.contains(e.target)) closeAuthMenu();
  const userWrap = $('userDropdownWrap');
  if (userWrap && !userWrap.contains(e.target)) closeUserMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAuthMenu();
    closeUserMenu();
  }
});
$('authMenu')?.addEventListener('click', (e) => { if (e.target.closest('a')) closeAuthMenu(); });
function closeMobileMenu() {
  $('mobileMenu')?.classList.add('hidden');
  $('menuBtn')?.setAttribute('aria-expanded', 'false');
}
function renderMobileMenu() {
  const role = isCompany() ? 'company' : isCandidate() ? 'candidate' : 'public';
  const links = NAVS[role].map(([h, l]) => `<a href="${h}">${l}</a>`).join('');
  let auth;
  if (role === 'public') {
    auth = `<div class="dropdown-label">Candidate</div><a href="#/login">Login</a><a href="#/register">Register</a><div class="dropdown-label">Company</div><a href="#/company/login">Company Login</a><a href="#/company/register">Company Register</a>`;
  } else if (role === 'candidate') {
    auth = `<a href="#/profile">👤 Profile & Account</a><a href="#" id="mNotifs">🔔 Notifications (<span id="mNotifCount">0</span>)</a><a href="#" id="mMessages">💬 Messages (<span id="mMsgCount">0</span>)</a><a href="#" id="mLogout">🚪 Logout</a>`;
  } else {
    auth = `<a href="#/company/dashboard">🏢 Dashboard</a><a href="#" id="mNotifs">🔔 Notifications (<span id="mNotifCount">0</span>)</a><a href="#" id="mMessages">💬 Messages (<span id="mMsgCount">0</span>)</a><a href="#" id="mLogout">🚪 Logout</a>`;
  }
  $('mobileMenu').innerHTML = links + auth;
  const out = $('mLogout');
  if (out) out.addEventListener('click', (e) => { e.preventDefault(); $('logoutBtn')?.click(); closeMobileMenu(); });
  const mNotif = $('mNotifs');
  if (mNotif) mNotif.addEventListener('click', (e) => { e.preventDefault(); closeMobileMenu(); $('notifToggleBtn')?.click(); });
  const mMsg = $('mMessages');
  if (mMsg) mMsg.addEventListener('click', (e) => { e.preventDefault(); closeMobileMenu(); openChatModal(); });
}
$('menuBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const willOpen = $('mobileMenu').classList.contains('hidden');
  if (willOpen) renderMobileMenu();
  $('mobileMenu').classList.toggle('hidden');
  $('menuBtn').setAttribute('aria-expanded', String(willOpen));
});
$('mobileMenu')?.addEventListener('click', (e) => { if (e.target.closest('a')) closeMobileMenu(); });
document.addEventListener('click', (e) => {
  if (!$('mobileMenu')?.classList.contains('hidden') && !$('mobileMenu')?.contains(e.target) && e.target !== $('menuBtn')) closeMobileMenu();
});
$('logoutBtn')?.addEventListener('click', () => {
  ['token', 'role', 'email', 'name'].forEach((k) => localStorage.removeItem(k));
  savedJobIdsSet.clear();
  cachedApplications = [];
  cachedSavedJobs = [];
  conversationsCache = [];
  closeUserMenu();
  renderNav();
  toast('Logged out successfully');
  location.hash = '#/jobs';
});
function loginAs({ token, role, email, name }) {
  localStorage.setItem('token', token);
  localStorage.setItem('role', role);
  localStorage.setItem('email', email || '');
  localStorage.setItem('name', name || '');
  renderNav();
}

// ---------- hash router ----------
const CANDIDATE_ONLY = ['dashboard', 'my-applications', 'profile'];
const COMPANY_ONLY = ['company/dashboard', 'company/jobs', 'company/jobs/create', 'company/applications'];
function route() {
  let h = (location.hash || '#/jobs').replace(/^#\//, '');
  if (h.startsWith('company/jobs/') && h.endsWith('/edit')) h = 'company/jobs/edit';
  const viewMap = {
    dashboard: 'view-dashboard', jobs: 'view-jobs', login: 'view-login', register: 'view-register',
    'my-applications': 'view-my-applications', profile: 'view-profile',
    'company/login': 'view-company-login', 'company/register': 'view-company-register',
    'company/dashboard': 'view-company-dashboard', 'company/jobs': 'view-company-jobs',
    'company/jobs/create': 'view-company-job-form', 'company/jobs/edit': 'view-company-job-form',
    'company/applications': 'view-company-applications',
  };
  const pathMap = { '/login': 'login', '/register': 'register', '/jobs': 'jobs', '/dashboard': 'dashboard', '/my-applications': 'my-applications', '/profile': 'profile', '/company/login': 'company/login', '/company/register': 'company/register', '/company/dashboard': 'company/dashboard', '/company/jobs': 'company/jobs', '/company/jobs/create': 'company/jobs/create', '/company/applications': 'company/applications' };
  if (!location.hash && pathMap[location.pathname]) {
    location.hash = '#/' + pathMap[location.pathname];
    return;
  }
  if (CANDIDATE_ONLY.includes(h) && !isCandidate()) {
    toast(isCompany() ? 'Companies cannot access candidate pages' : 'Login as a candidate first');
    location.hash = isCompany() ? '#/company/dashboard' : '#/login';
    return;
  }
  if (COMPANY_ONLY.includes(h) && !isCompany()) {
    toast(isCandidate() ? 'Candidates cannot access company pages' : 'Login as a company first');
    location.hash = isCandidate() ? '#/dashboard' : '#/company/login';
    return;
  }
  if ((h === 'login' || h === 'register') && session().token) { location.hash = isCompany() ? '#/company/dashboard' : '#/dashboard'; return; }
  if ((h === 'company/login' || h === 'company/register') && session().token) { location.hash = isCompany() ? '#/company/dashboard' : '#/dashboard'; return; }
  const view = viewMap[h] || 'view-jobs';
  closeMobileMenu();
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  $(view).classList.add('active');
  document.querySelectorAll('#mainNav .nav-btn').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#/' + h));
  wirePasswordToggles();
  if (h === 'dashboard') loadCandidateDashboard();
  if (h === 'jobs') { loadJobs(); loadRecommendedTeaser(); }
  if (h === 'my-applications') loadApplications();
  if (h === 'profile') loadProfile();
  if (h === 'company/dashboard') loadDashboard();
  if (h === 'company/jobs') loadCompanyJobs();
  if (h === 'company/jobs/create') openJobForm(null);
  if (h === 'company/jobs/edit') openJobForm((location.hash.match(/company\/jobs\/([^/]+)\/edit/) || [])[1]);
  if (h === 'company/applications') loadCompanyApplications();
}
window.addEventListener('hashchange', route);

// ---------- candidate auth ----------
$('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if ($('regPassword').value !== $('regConfirm').value) return toast('Passwords do not match');
  try {
    await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: $('regName').value, email: $('regEmail').value, password: $('regPassword').value }) });
    toast('Account created! Now login.');
    $('loginEmail').value = $('regEmail').value;
    e.target.reset();
    location.hash = '#/login';
  } catch (err) { toast(err.message); }
});
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: $('loginEmail').value, password: $('loginPassword').value }) });
    loginAs({ token: res.data.token, role: 'candidate', email: res.data.user.email, name: res.data.user.name });
    toast(res.message || 'Login successful'); location.hash = '#/dashboard';
  } catch (err) { toast(err.message); }
});

// ---------- company auth ----------
$('companyRegisterForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if ($('coRegPassword').value !== $('coRegConfirm').value) return toast('Passwords do not match');
  try {
    await api('/api/company/auth/register', { method: 'POST', body: JSON.stringify({ company_name: $('coRegName').value, email: $('coRegEmail').value, password: $('coRegPassword').value, location: $('coRegLocation').value, website: $('coRegWebsite').value || undefined }) });
    toast('Company registered! Now login.');
    $('coLoginEmail').value = $('coRegEmail').value;
    e.target.reset();
    location.hash = '#/company/login';
  } catch (err) { toast(err.message); }
});
$('companyLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await api('/api/company/auth/login', { method: 'POST', body: JSON.stringify({ email: $('coLoginEmail').value, password: $('coLoginPassword').value }) });
    loginAs({ token: res.data.token, role: 'company', email: res.data.company.email, name: res.data.company.company_name });
    toast(res.message || 'Company login successful'); location.hash = '#/company/dashboard';
  } catch (err) { toast(err.message); }
});

// ---------- job cards & saved bookmarks ----------
let page = 1; const limit = 9; let cache = [];

async function fetchSavedJobIds() {
  if (!isCandidate()) return;
  try {
    const res = await api('/api/saved-jobs/ids');
    savedJobIdsSet.clear();
    (res.data?.ids || []).forEach((id) => savedJobIdsSet.add(id));
  } catch (err) {
    console.warn('Error fetching saved job IDs:', err);
  }
}

async function toggleSaveJob(jobId) {
  if (!isCandidate()) {
    toast('Login as a candidate to save jobs');
    location.hash = '#/login';
    return;
  }
  try {
    const res = await api(`/api/saved-jobs/${jobId}`, { method: 'POST' });
    const isSaved = res.data?.saved;
    if (isSaved) {
      savedJobIdsSet.add(jobId);
      toast('🔖 Job saved to your bookmarks!');
    } else {
      savedJobIdsSet.delete(jobId);
      toast('Job removed from saved bookmarks');
    }
    document.querySelectorAll(`[data-save-job="${jobId}"]`).forEach((btn) => {
      btn.classList.toggle('saved', isSaved);
      btn.innerHTML = isSaved ? '❤️ Saved' : '🤍 Save';
    });
    // If on applications page, reload tab counts & list
    if (location.hash === '#/my-applications') {
      loadApplications();
    }
  } catch (err) {
    toast(err.message);
  }
}

function matchBadge(j) {
  return (j.match_percentage != null && j.match_percentage > 0) ? ` <span class="match-badge">${j.match_percentage}% Match</span>` : '';
}
function skillsBlock(j) {
  const matched = skillList(j.matched_skills).map((s) => `✓ ${s}`).join(' · ');
  const required = skillList(j.skills).join(', ');
  if (matched) return `<div class="muted">Skills matched: ${matched}</div><div class="muted">Required: ${required}</div>`;
  return `<div class="muted">${required.slice(0, 90)}</div>`;
}
function jobCard(j) {
  const isSaved = savedJobIdsSet.has(j.id);
  const saveBtn = isCandidate() ? `<button type="button" class="btn-save-toggle ${isSaved ? 'saved' : ''}" data-save-job="${j.id}" title="${isSaved ? 'Remove from saved' : 'Save job'}">${isSaved ? '❤️ Saved' : '🤍 Save'}</button>` : '';
  const chatBtn = (isCandidate() && j.company_id) ? `<button type="button" class="btn btn-ghost btn-sm" data-chat-job="${j.id}" data-company-id="${j.company_id}" data-company-name="${escapeHtml(j.company)}" title="Chat with hiring team">💬 Chat</button>` : '';

  return `
    <div class="job-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap;">
        <span class="pill">${j.employment_type || 'Full-time'} • ${j.location || 'Remote'}</span>
        ${saveBtn}
      </div>
      <h3>${j.title}${matchBadge(j)}</h3>
      <div class="muted">${j.company}</div>
      ${skillsBlock(j)}
      <div class="job-actions">
        <button type="button" class="btn btn-ghost" data-details="${j.id}">View Details</button>
        ${chatBtn}
        <button type="button" class="btn btn-primary" data-apply="${j.id}">Apply</button>
      </div>
    </div>`;
}
function trackJobs(rows) {
  rows.forEach((j) => { if (!cache.some((c) => c.id === j.id)) cache.push(j); });
}
let applyingJob = null;
let candidateProfileCache = null;

async function getCandidateProfile() {
  if (candidateProfileCache) return candidateProfileCache;
  try {
    const res = await api('/api/users/me');
    candidateProfileCache = res.data;
    return candidateProfileCache;
  } catch { return null; }
}

let currentResumeProfile = null;

function renderHireFlowResumeView(profile) {
  currentResumeProfile = profile;
  const rd = profile.resume_data || {};

  if ($('hfResumeName')) $('hfResumeName').textContent = profile.name || 'Candidate';
  const headlineEl = $('hfResumeHeadline');
  if (headlineEl) {
    headlineEl.textContent = rd.headline || (skillList(profile.skills).length ? `${skillList(profile.skills).slice(0, 3).join(' • ')} Specialist` : 'Candidate Profile');
  }

  if ($('hfResumeEmail')) $('hfResumeEmail').textContent = profile.email || '';

  // Phone & Location
  const phoneEl = $('hfResumePhone');
  if (phoneEl) {
    if (rd.phone) {
      phoneEl.textContent = `📱 ${rd.phone}`;
      phoneEl.classList.remove('hidden');
    } else {
      phoneEl.classList.add('hidden');
    }
  }

  const locEl = $('hfResumeLocation');
  if (locEl) {
    if (rd.location) {
      locEl.textContent = `📍 ${rd.location}`;
      locEl.classList.remove('hidden');
    } else {
      locEl.classList.add('hidden');
    }
  }

  // Links
  const webEl = $('hfResumeWebsite');
  if (webEl) {
    if (rd.website) {
      webEl.href = rd.website.startsWith('http') ? rd.website : `https://${rd.website}`;
      webEl.classList.remove('hidden');
    } else {
      webEl.classList.add('hidden');
    }
  }

  const liEl = $('hfResumeLinkedIn');
  if (liEl) {
    if (rd.linkedin) {
      liEl.href = rd.linkedin.startsWith('http') ? rd.linkedin : `https://${rd.linkedin}`;
      liEl.classList.remove('hidden');
    } else {
      liEl.classList.add('hidden');
    }
  }

  const ghEl = $('hfResumeGitHub');
  if (ghEl) {
    if (rd.github) {
      ghEl.href = rd.github.startsWith('http') ? rd.github : `https://${rd.github}`;
      ghEl.classList.remove('hidden');
    } else {
      ghEl.classList.add('hidden');
    }
  }

  // Summary
  if ($('hfResumeSummary')) {
    $('hfResumeSummary').textContent = rd.summary || 'Enthusiastic and motivated candidate applying through HireFlow. Ready to contribute technical expertise and achieve results.';
  }

  // Skills
  const skills = skillList(profile.skills);
  if ($('hfResumeSkills')) {
    $('hfResumeSkills').innerHTML = skills.length
      ? skills.map((s) => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('')
      : '<span class="muted font-xs">No technical skills detected yet. Upload a resume or click "Edit Resume" to add skills.</span>';
  }

  // Work Experience
  const expListEl = $('hfResumeExpList');
  if (expListEl) {
    const exps = Array.isArray(rd.experience) ? rd.experience : [];
    if (!exps.length) {
      expListEl.innerHTML = '<span class="muted font-xs">No experience added yet. Click "Edit Resume" to add your roles or internships.</span>';
    } else {
      expListEl.innerHTML = exps.map((x) => `
        <div class="hf-item-card">
          <div class="hf-item-title-row">
            <strong>${escapeHtml(x.title || 'Role')}</strong>
            <span class="hf-item-date">${escapeHtml(x.startDate || '')} ${x.endDate ? '– ' + escapeHtml(x.endDate) : ''}</span>
          </div>
          <div class="hf-item-sub">${escapeHtml(x.company || '')} ${x.location ? '• ' + escapeHtml(x.location) : ''}</div>
          ${x.description ? `<div class="hf-item-desc">${escapeHtml(x.description)}</div>` : ''}
        </div>`).join('');
    }
  }

  // Education
  const eduListEl = $('hfResumeEduList');
  if (eduListEl) {
    const edus = Array.isArray(rd.education) ? rd.education : [];
    if (!edus.length) {
      eduListEl.innerHTML = '<span class="muted font-xs">No education details added yet. Click "Edit Resume" to add degree or university.</span>';
    } else {
      eduListEl.innerHTML = edus.map((e) => `
        <div class="hf-item-card">
          <div class="hf-item-title-row">
            <strong>${escapeHtml(e.degree || 'Degree / Field')}</strong>
            <span class="hf-item-date">${escapeHtml(e.year || '')}</span>
          </div>
          <div class="hf-item-sub">${escapeHtml(e.institution || '')} ${e.grade ? '• ' + escapeHtml(e.grade) : ''}</div>
        </div>`).join('');
    }
  }

  // Projects
  const projListEl = $('hfResumeProjList');
  if (projListEl) {
    const projs = Array.isArray(rd.projects) ? rd.projects : [];
    if (!projs.length) {
      projListEl.innerHTML = '<span class="muted font-xs">No projects added yet. Click "Edit Resume" to showcase your projects.</span>';
    } else {
      projListEl.innerHTML = projs.map((p) => `
        <div class="hf-proj-card">
          <div class="hf-proj-title">
            <strong>${escapeHtml(p.title || 'Project')}</strong>
            ${p.link ? `<a href="${p.link.startsWith('http') ? p.link : 'https://' + p.link}" target="_blank" rel="noopener">🔗 Link</a>` : ''}
          </div>
          ${p.techStack ? `<div class="hf-proj-stack">Tech: ${escapeHtml(p.techStack)}</div>` : ''}
          ${p.description ? `<div class="hf-item-desc">${escapeHtml(p.description)}</div>` : ''}
        </div>`).join('');
    }
  }

  // Certifications
  const certListEl = $('hfResumeCertList');
  if (certListEl) {
    const certs = Array.isArray(rd.certifications) ? rd.certifications : [];
    if (!certs.length) {
      certListEl.innerHTML = '<span class="muted font-xs">No certifications added yet.</span>';
    } else {
      certListEl.innerHTML = certs.map((c) => `
        <div class="hf-cert-item">
          <div>
            <strong>${escapeHtml(c.name || 'Certification')}</strong>
            ${c.issuer ? `<span class="muted font-xs"> • ${escapeHtml(c.issuer)}</span>` : ''}
          </div>
          <span class="hf-item-date">${escapeHtml(c.year || '')}</span>
        </div>`).join('');
    }
  }

  // Original Document Link
  const docLinkEl = $('hfResumeDocLink');
  if (docLinkEl) {
    if (profile.resume_url) {
      docLinkEl.innerHTML = `<a href="${profile.resume_url}" target="_blank" class="btn btn-ghost btn-sm">📄 View Original Uploaded Document</a>`;
    } else {
      docLinkEl.textContent = 'No original document uploaded yet.';
    }
  }
}

function switchHireFlowModalMode(mode) {
  const isEdit = mode === 'edit';
  $('hfPreviewMode')?.classList.toggle('hidden', isEdit);
  $('hfEditResumeForm')?.classList.toggle('hidden', !isEdit);
  $('btnEditHireFlowResume')?.classList.toggle('hidden', isEdit);
  $('btnQuickEditResume')?.classList.toggle('hidden', isEdit);
  $('btnPreviewModeHireFlowResume')?.classList.toggle('hidden', !isEdit);
  $('hfViewModalActions')?.classList.toggle('hidden', isEdit);

  if (isCompany()) {
    $('btnEditHireFlowResume')?.classList.add('hidden');
    $('btnQuickEditResume')?.classList.add('hidden');
  }
}

function createExpItemEl(data = {}) {
  const div = document.createElement('div');
  div.className = 'hf-repeater-item';
  div.innerHTML = `
    <div class="hf-repeater-item-header">
      <strong>Role / Position</strong>
      <button type="button" class="hf-btn-remove" title="Remove">✕ Remove</button>
    </div>
    <div class="grid-2">
      <label>Job Title / Role
        <input type="text" class="exp-title" placeholder="e.g. Software Developer Intern" value="${escapeHtml(data.title || '')}" />
      </label>
      <label>Company / Organization
        <input type="text" class="exp-company" placeholder="e.g. Google or Tech Corp" value="${escapeHtml(data.company || '')}" />
      </label>
      <label>Location
        <input type="text" class="exp-location" placeholder="e.g. Ahmedabad or Remote" value="${escapeHtml(data.location || '')}" />
      </label>
      <label>Duration / Dates
        <div style="display:flex;gap:0.4rem;">
          <input type="text" class="exp-start" placeholder="e.g. Jun 2023" value="${escapeHtml(data.startDate || '')}" />
          <input type="text" class="exp-end" placeholder="e.g. Present" value="${escapeHtml(data.endDate || '')}" />
        </div>
      </label>
      <label class="span-2">Responsibilities & Key Achievements
        <textarea class="exp-desc" rows="2" placeholder="Key contributions, projects delivered, or technologies used...">${escapeHtml(data.description || '')}</textarea>
      </label>
    </div>`;
  div.querySelector('.hf-btn-remove')?.addEventListener('click', () => div.remove());
  return div;
}

function createEduItemEl(data = {}) {
  const div = document.createElement('div');
  div.className = 'hf-repeater-item';
  div.innerHTML = `
    <div class="hf-repeater-item-header">
      <strong>Degree / Academic Qualification</strong>
      <button type="button" class="hf-btn-remove" title="Remove">✕ Remove</button>
    </div>
    <div class="grid-2">
      <label>Degree / Qualification
        <input type="text" class="edu-degree" placeholder="e.g. B.Tech in Computer Engineering" value="${escapeHtml(data.degree || '')}" />
      </label>
      <label>College / University / School
        <input type="text" class="edu-inst" placeholder="e.g. Gujarat Technological University" value="${escapeHtml(data.institution || '')}" />
      </label>
      <label>Passing Year
        <input type="text" class="edu-year" placeholder="e.g. 2024" value="${escapeHtml(data.year || '')}" />
      </label>
      <label>Grade / CGPA / Percentage
        <input type="text" class="edu-grade" placeholder="e.g. 8.5 CGPA" value="${escapeHtml(data.grade || '')}" />
      </label>
    </div>`;
  div.querySelector('.hf-btn-remove')?.addEventListener('click', () => div.remove());
  return div;
}

function createProjItemEl(data = {}) {
  const div = document.createElement('div');
  div.className = 'hf-repeater-item';
  div.innerHTML = `
    <div class="hf-repeater-item-header">
      <strong>Key Project</strong>
      <button type="button" class="hf-btn-remove" title="Remove">✕ Remove</button>
    </div>
    <div class="grid-2">
      <label>Project Title
        <input type="text" class="proj-title" placeholder="e.g. HireFlow Job Portal" value="${escapeHtml(data.title || '')}" />
      </label>
      <label>Technologies Used
        <input type="text" class="proj-tech" placeholder="e.g. Node.js, Express, React, PostgreSQL" value="${escapeHtml(data.techStack || '')}" />
      </label>
      <label class="span-2">Live Demo / GitHub Link
        <input type="url" class="proj-link" placeholder="https://github.com/vraj/hireflow" value="${escapeHtml(data.link || '')}" />
      </label>
      <label class="span-2">Project Description
        <textarea class="proj-desc" rows="2" placeholder="Key features, user impact, architecture...">${escapeHtml(data.description || '')}</textarea>
      </label>
    </div>`;
  div.querySelector('.hf-btn-remove')?.addEventListener('click', () => div.remove());
  return div;
}

function createCertItemEl(data = {}) {
  const div = document.createElement('div');
  div.className = 'hf-repeater-item';
  div.innerHTML = `
    <div class="hf-repeater-item-header">
      <strong>Certification</strong>
      <button type="button" class="hf-btn-remove" title="Remove">✕ Remove</button>
    </div>
    <div class="grid-2">
      <label>Certificate / Course Name
        <input type="text" class="cert-name" placeholder="e.g. Meta Full Stack Developer Professional" value="${escapeHtml(data.name || '')}" />
      </label>
      <label>Issuing Organization
        <input type="text" class="cert-issuer" placeholder="e.g. Coursera, Meta, AWS" value="${escapeHtml(data.issuer || '')}" />
      </label>
      <label class="span-2">Year / Date
        <input type="text" class="cert-year" placeholder="e.g. 2024" value="${escapeHtml(data.year || '')}" />
      </label>
    </div>`;
  div.querySelector('.hf-btn-remove')?.addEventListener('click', () => div.remove());
  return div;
}

function populateHireFlowResumeForm(profile) {
  const rd = profile.resume_data || {};
  if ($('hfEditNameInput')) $('hfEditNameInput').value = profile.name || '';
  if ($('hfEditHeadlineInput')) $('hfEditHeadlineInput').value = rd.headline || '';
  if ($('hfEditPhoneInput')) $('hfEditPhoneInput').value = rd.phone || '';
  if ($('hfEditLocationInput')) $('hfEditLocationInput').value = rd.location || '';
  if ($('hfEditWebsiteInput')) $('hfEditWebsiteInput').value = rd.website || '';
  if ($('hfEditLinkedInInput')) $('hfEditLinkedInInput').value = rd.linkedin || '';
  if ($('hfEditGitHubInput')) $('hfEditGitHubInput').value = rd.github || '';
  if ($('hfEditSummaryInput')) $('hfEditSummaryInput').value = rd.summary || '';
  if ($('hfEditSkillsInput')) $('hfEditSkillsInput').value = skillList(profile.skills).join(', ');

  // Repeater containers
  const expBox = $('hfEditExpItems');
  if (expBox) {
    expBox.innerHTML = '';
    const items = Array.isArray(rd.experience) && rd.experience.length ? rd.experience : [{}];
    items.forEach((item) => expBox.appendChild(createExpItemEl(item)));
  }

  const eduBox = $('hfEditEduItems');
  if (eduBox) {
    eduBox.innerHTML = '';
    const items = Array.isArray(rd.education) && rd.education.length ? rd.education : [{}];
    items.forEach((item) => eduBox.appendChild(createEduItemEl(item)));
  }

  const projBox = $('hfEditProjItems');
  if (projBox) {
    projBox.innerHTML = '';
    const items = Array.isArray(rd.projects) && rd.projects.length ? rd.projects : [{}];
    items.forEach((item) => projBox.appendChild(createProjItemEl(item)));
  }

  const certBox = $('hfEditCertItems');
  if (certBox) {
    certBox.innerHTML = '';
    const items = Array.isArray(rd.certifications) && rd.certifications.length ? rd.certifications : [];
    items.forEach((item) => certBox.appendChild(createCertItemEl(item)));
  }
}

async function showHireFlowResumeModal(customUser = null, startInEdit = false) {
  const profile = customUser || await getCandidateProfile();
  if (!profile) return toast('Candidate profile not found. Please log in.');

  renderHireFlowResumeView(profile);
  populateHireFlowResumeForm(profile);

  switchHireFlowModalMode(startInEdit && !isCompany() ? 'edit' : 'preview');
  $('hireflowResumeModal')?.classList.remove('hidden');
}

async function openApplyModal(jobId) {
  if (!isCandidate()) {
    location.hash = '#/login';
    return toast(isCompany() ? 'Companies cannot apply — login as a candidate' : 'Login as a candidate to apply');
  }

  const j = cache.find((x) => x.id === jobId);
  if (!j) return toast('Job details not found');
  applyingJob = j;

  $('jobModal')?.classList.add('hidden');

  $('applyJobTitle').textContent = j.title;
  $('applyJobMeta').textContent = `${j.company} • ${j.location || 'Remote'} • ${j.employment_type || 'Full-time'}`;
  $('applyJobSubtitle').textContent = `Select your resume to submit to ${j.company}`;

  const profile = await getCandidateProfile();
  if (profile) {
    if (profile.resume_url) {
      $('applyHireFlowStatus').innerHTML = `Current resume: <a href="${profile.resume_url}" target="_blank">View attached resume</a>. Verified skills: ${skillList(profile.skills).slice(0, 5).join(', ')}`;
    } else {
      $('applyHireFlowStatus').textContent = `Using your HireFlow Profile Resume with verified skills: ${skillList(profile.skills).join(', ') || 'No skills uploaded yet'}`;
    }
  }

  $('optHireFlow').checked = true;
  $('optHireFlowCard').classList.add('selected');
  $('optUploadCard').classList.remove('selected');
  $('applyUploadSection').classList.add('hidden');
  $('applyResumeFile').value = '';
  $('applyNote').value = '';
  $('applyUploadStatus').textContent = '';

  $('applyModal').classList.remove('hidden');
}

function wireJobButtons(root = document) {
  root.querySelectorAll('[data-apply]').forEach((b) => b.addEventListener('click', () => {
    openApplyModal(b.dataset.apply);
  }));
  root.querySelectorAll('[data-save-job]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSaveJob(b.dataset.saveJob);
  }));
  root.querySelectorAll('[data-chat-job]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const j = cache.find((x) => x.id === b.dataset.chatJob);
    openChatModal(b.dataset.companyId, j, { name: b.dataset.companyName });
  }));
  root.querySelectorAll('[data-details]').forEach((b) => b.addEventListener('click', () => {
    const j = cache.find((x) => x.id === b.dataset.details);
    if (!j) return;
    const isSaved = savedJobIdsSet.has(j.id);
    const saveBtnHtml = isCandidate() ? `<button type="button" class="btn btn-ghost" id="modalSaveBtn">${isSaved ? '❤️ Saved in Bookmarks' : '🤍 Save Job'}</button>` : '';
    const chatBtnHtml = (isCandidate() && j.company_id) ? `<button type="button" class="btn btn-secondary" id="modalChatBtn">💬 Message Company</button>` : '';

    $('modalBody').innerHTML = `
      <span class="pill">${j.employment_type || 'Full-time'} • ${j.location || 'Remote'}</span>
      <h2>${escapeHtml(j.title)}</h2>
      <p class="muted"><strong>${escapeHtml(j.company)}</strong> ${j.location ? `• 📍 ${escapeHtml(j.location)}` : ''}</p>
      ${j.match_percentage > 0 ? `<p><span class="match-badge">${j.match_percentage}% Match</span> <span class="muted">on ${(j.matched_skills || []).map((s) => `✓ ${s}`).join(' · ')}</span></p>` : ''}
      <p style="white-space:pre-line;line-height:1.6;">${escapeHtml(j.description || 'No detailed description provided.')}</p>
      <p><b>Required skills:</b> ${skillList(j.skills).join(', ') || '-'}</p>
      <div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:1.2rem;">
        <button type="button" class="btn btn-primary" id="modalApply">Apply for this job</button>
        ${chatBtnHtml}
        ${saveBtnHtml}
      </div>`;
    $('jobModal').classList.remove('hidden');

    $('modalApply')?.addEventListener('click', () => openApplyModal(j.id));
    $('modalChatBtn')?.addEventListener('click', () => {
      $('jobModal').classList.add('hidden');
      openChatModal(j.company_id, j, { name: j.company });
    });
    $('modalSaveBtn')?.addEventListener('click', async () => {
      await toggleSaveJob(j.id);
      const nowSaved = savedJobIdsSet.has(j.id);
      const btn = $('modalSaveBtn');
      if (btn) btn.textContent = nowSaved ? '❤️ Saved in Bookmarks' : '🤍 Save Job';
    });
  }));
}

// ---------- candidate dashboard + recommendations ----------
async function fetchRecommended() {
  const res = await api('/api/jobs/recommended');
  return { jobs: res.data || [], message: res.message || '' };
}
async function loadCandidateDashboard() {
  $('dashHello').textContent = `Welcome, ${session().name || 'Candidate'}`;
  // skills
  try {
    const me = await api('/api/users/me');
    const skills = skillList(me.data.skills);
    $('dashSkills').innerHTML = skills.length ? skills.map((s) => `<span class="skill-tag">${s}</span>`).join('') : '<span class="muted">No skills yet — upload your resume.</span>';
    $('dashResumeLink').innerHTML = me.data.resume_url ? `<p><a href="${me.data.resume_url}" target="_blank">View current resume</a></p>` : '';
  } catch (err) { $('dashSkills').innerHTML = `<span class="muted">${err.message}</span>`; }
  // recommended
  try {
    const { jobs, message } = await fetchRecommended();
    candidateRecommendedJobs = jobs;
    trackJobs(jobs);
    renderCandidateDashboardJobs(message);
  } catch (err) { $('dashJobsInfo').innerHTML = `<p class="muted">${err.message}</p>`; }
}

let candidateRecommendedJobs = [];
function renderCandidateDashboardJobs(defaultMessage) {
  const kw = ($('dashSearchKeyword')?.value || '').trim().toLowerCase();
  const loc = ($('dashSearchLocation')?.value || '').trim().toLowerCase();

  let filtered = candidateRecommendedJobs || [];
  if (kw) {
    filtered = filtered.filter((j) =>
      `${j.title} ${j.company} ${j.description || ''} ${skillList(j.skills).join(' ')}`.toLowerCase().includes(kw)
    );
  }
  if (loc && loc !== 'all locations') {
    filtered = filtered.filter((j) => (j.location || '').toLowerCase().includes(loc));
  }

  if (!filtered.length) {
    $('dashJobsInfo').innerHTML = `<p class="muted">${kw || loc ? 'No matching jobs found with your search criteria.' : (defaultMessage || 'No matching jobs found.')}</p>`;
    $('dashJobs').innerHTML = '';
  } else {
    $('dashJobsInfo').innerHTML = `<p class="muted">${kw || loc ? `Showing ${filtered.length} matching position(s).` : (defaultMessage || 'Based on your resume.')}</p>`;
    $('dashJobs').innerHTML = filtered.map(jobCard).join('');
  }
  wireJobButtons();
}

$('dashSearchBtn')?.addEventListener('click', () => renderCandidateDashboardJobs());
$('dashSearchKeyword')?.addEventListener('input', () => renderCandidateDashboardJobs());
$('dashSearchLocation')?.addEventListener('change', () => renderCandidateDashboardJobs());
$('dashSearchReset')?.addEventListener('click', () => {
  if ($('dashSearchKeyword')) $('dashSearchKeyword').value = '';
  if ($('dashSearchLocation')) $('dashSearchLocation').value = '';
  renderCandidateDashboardJobs();
});

function uploadResume(fileInputId, done) {
  return async (e) => {
    e.preventDefault();
    const file = $(fileInputId).files[0];
    if (!file) return toast('Choose a file first');
    const fd = new FormData(); fd.append('resume', file);
    try {
      toast('Uploading resume...');
      const res = await api('/api/users/resume', { method: 'POST', body: fd });
      const skills = skillList(res.data.skills);
      toast(skills.length ? `Resume uploaded! Skills detected: ${skills.join(', ')}. Finding matching jobs...` : 'Resume uploaded, but no supported technical skills were detected.');
      if (done) done();
      else { loadCandidateDashboard(); }
    } catch (err) { toast(err.message); }
  };
}
$('dashResumeForm').addEventListener('submit', uploadResume('dashResumeFile', () => { route(); }));

// ---------- public jobs page: teaser + all jobs ----------
async function loadRecommendedTeaser() {
  const banner = $('matchBanner'), noResume = $('noResumeBanner');
  banner.classList.add('hidden'); noResume.classList.add('hidden');
  if (!isCandidate()) return;
  try {
    const { jobs } = await fetchRecommended();
    if (!jobs.length) { noResume.classList.remove('hidden'); return; }
    const top = jobs.slice(0, 3);
    const me = await api('/api/users/me').catch(() => null);
    $('matchSkills').textContent = me ? `— based on: ${skillList(me.data.skills).join(', ')}` : '';
    $('matchedGrid').innerHTML = top.map(jobCard).join('');
    banner.classList.remove('hidden');
    trackJobs(top);
    wireJobButtons();
  } catch { /* teaser is optional; all jobs still load */ }
}

const distinctLocations = new Set(['Remote', 'Ahmedabad', 'Surat', 'Vadodara', 'Bangalore', 'Mumbai']);
function updateLocationOptions() {
  const optionsHtml = '<option value="">All Locations</option>' +
    Array.from(distinctLocations).sort().map((loc) => `<option value="${loc}">${loc}</option>`).join('');

  const jobLoc = $('jobLocation');
  const dashLoc = $('dashSearchLocation');
  if (jobLoc && jobLoc.children.length <= 7) {
    const cur = jobLoc.value;
    jobLoc.innerHTML = optionsHtml;
    jobLoc.value = cur;
  }
  if (dashLoc && dashLoc.children.length <= 7) {
    const cur = dashLoc.value;
    dashLoc.innerHTML = optionsHtml;
    dashLoc.value = cur;
  }
}

async function loadJobs() {
  try {
    const kw = ($('jobKeyword')?.value || '').trim();
    const loc = ($('jobLocation')?.value || '').trim();

    const queryParams = new URLSearchParams({ page, limit });
    if (kw) queryParams.set('keyword', kw);
    if (loc && loc.toLowerCase() !== 'all locations') queryParams.set('location', loc);

    const res = await fetch(`/api/jobs?${queryParams.toString()}`).then((r) => r.json());
    let rows = res.data || [];
    cache = rows;

    rows.forEach((j) => {
      if (j.location) distinctLocations.add(j.location.trim());
    });
    updateLocationOptions();

    // Secondary client filter for instant multi-field match
    if (kw) {
      const q = kw.toLowerCase();
      rows = rows.filter((j) => `${j.title} ${j.company} ${j.location || ''} ${skillList(j.skills).join(' ')}`.toLowerCase().includes(q));
    }
    if (loc && loc.toLowerCase() !== 'all locations') {
      rows = rows.filter((j) => (j.location || '').toLowerCase().includes(loc.toLowerCase()));
    }

    $('jobsGrid').innerHTML = rows.length ? rows.map(jobCard).join('') : '<p class="muted">No jobs found matching your criteria.</p>';
    $('pageInfo').textContent = `Page ${res.pagination?.page || page} of ${res.pagination?.totalPages || 1} (${res.pagination?.total || rows.length} jobs)`;
    wireJobButtons();
  } catch (err) { toast(err.message); }
}

$('modalClose').addEventListener('click', () => $('jobModal').classList.add('hidden'));
$('searchJobsBtn')?.addEventListener('click', () => { page = 1; loadJobs(); });
$('refreshJobs')?.addEventListener('click', () => {
  if ($('jobKeyword')) $('jobKeyword').value = '';
  if ($('jobLocation')) $('jobLocation').value = '';
  page = 1;
  loadJobs();
});
$('jobKeyword')?.addEventListener('input', () => { page = 1; loadJobs(); });
$('jobLocation')?.addEventListener('change', () => { page = 1; loadJobs(); });
$('prevPage').addEventListener('click', () => { if (page > 1) { page--; loadJobs(); } });
$('nextPage').addEventListener('click', () => { page++; loadJobs(); });

// ---------- candidate: applications & tabs (All, Applied, Interview, Saved, Archived) ----------
const STATUS_CLASS = {
  Applied: 'applied',
  'Under Review': 'warn',
  Shortlisted: 'good',
  Interview: 'interview',
  Archived: 'archived',
  Rejected: 'bad'
};

async function loadApplications() {
  try {
    const [appsRes, savedRes] = await Promise.all([
      api('/api/applications'),
      api('/api/saved-jobs').catch(() => ({ data: { jobs: [] } }))
    ]);

    cachedApplications = appsRes.data || [];
    cachedSavedJobs = savedRes.data?.jobs || [];

    // Sync saved job IDs
    cachedSavedJobs.forEach((j) => savedJobIdsSet.add(j.id));

    // Calculate tab badge counts
    const countApplied = cachedApplications.filter((a) => a.status === 'Applied' || a.status === 'Under Review').length;
    const countInterview = cachedApplications.filter((a) => a.status === 'Interview' || a.status === 'Shortlisted').length;
    const countSaved = cachedSavedJobs.length;
    const countArchived = cachedApplications.filter((a) => a.status === 'Archived' || a.status === 'Rejected').length;
    const countAll = cachedApplications.length + countSaved;

    if ($('countTabAll')) $('countTabAll').textContent = countAll;
    if ($('countTabApplied')) $('countTabApplied').textContent = countApplied;
    if ($('countTabInterview')) $('countTabInterview').textContent = countInterview;
    if ($('countTabSaved')) $('countTabSaved').textContent = countSaved;
    if ($('countTabArchived')) $('countTabArchived').textContent = countArchived;

    renderApplications();
  } catch (err) {
    toast(err.message);
  }
}

function renderApplicationCard(a) {
  const j = a.Job || {};
  const comp = j.Company || {};
  const compName = j.company || comp.company_name || 'Hiring Team';
  const isArchived = a.status === 'Archived';
  const statusClass = STATUS_CLASS[a.status] || 'applied';
  const resumeLabel = a.resume_type === 'custom' ? 'Custom Uploaded Resume' : '🌟 HireFlow Profile Resume';
  const appDate = a.applied_at || a.createdAt;
  const appDateStr = (appDate && !isNaN(new Date(appDate).getTime()))
    ? new Date(appDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently';

  return `
    <div class="app-item-card" data-app-id="${a.id}">
      <div class="app-item-top">
        <div class="app-title-group">
          <h3>${escapeHtml(j.title || 'Position')}</h3>
          <div class="app-company-meta">
            <span>🏢 <strong>${escapeHtml(compName)}</strong></span>
            ${j.location ? `<span>📍 ${escapeHtml(j.location)}</span>` : ''}
            ${j.employment_type ? `<span>• ${j.employment_type}</span>` : ''}
          </div>
        </div>
        <span class="pill ${statusClass}">${a.status}</span>
      </div>

      <div class="app-details-row">
        <span>📅 Applied: <strong>${appDateStr}</strong></span>
        <span>📄 Resume: ${a.resume_url ? `<a href="${a.resume_url}" target="_blank"><u>${resumeLabel}</u></a>` : `<span>${resumeLabel}</span>`}</span>
        ${a.note ? `<span class="span-all muted">💬 Note: ${escapeHtml(a.note)}</span>` : ''}
      </div>

      <div class="app-actions-footer">
        <div class="app-btn-group">
          ${j.company_id ? `<button type="button" class="btn btn-secondary btn-sm" data-chat-company="${j.company_id}" data-job-id="${j.id}" data-company-name="${escapeHtml(compName)}">💬 Message Company</button>` : ''}
          <button type="button" class="btn btn-ghost btn-sm" data-archive-app="${a.id}">${isArchived ? '↩️ Move to Active' : '📁 Archive'}</button>
          <button type="button" class="btn-save-toggle ${savedJobIdsSet.has(j.id) ? 'saved' : ''}" data-save-job="${j.id}">${savedJobIdsSet.has(j.id) ? '❤️ Saved' : '🤍 Save'}</button>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" data-details="${j.id}">View Job Details</button>
      </div>
    </div>`;
}

function renderSavedJobCard(j) {
  const isApplied = cachedApplications.some((a) => a.job_id === j.id);
  const statusPill = isApplied ? '<span class="pill good">Applied ✓</span>' : '<span class="pill saved">Saved Bookmark</span>';
  const compName = j.company || j.Company?.company_name || 'Hiring Team';

  return `
    <div class="app-item-card" data-job-id="${j.id}">
      <div class="app-item-top">
        <div class="app-title-group">
          <h3>${escapeHtml(j.title)}</h3>
          <div class="app-company-meta">
            <span>🏢 <strong>${escapeHtml(compName)}</strong></span>
            <span>📍 ${escapeHtml(j.location || 'Remote')}</span>
            <span>• ${j.employment_type || 'Full-time'}</span>
          </div>
        </div>
        ${statusPill}
      </div>

      <div class="app-details-row">
        <span>Skills: ${skillList(j.skills).slice(0, 6).join(', ') || 'General'}</span>
      </div>

      <div class="app-actions-footer">
        <div class="app-btn-group">
          ${!isApplied ? `<button type="button" class="btn btn-primary btn-sm" data-apply="${j.id}">⚡ Apply Now</button>` : `<span class="muted font-xs">Application Submitted ✓</span>`}
          ${(j.company_id || j.Company?.id) ? `<button type="button" class="btn btn-secondary btn-sm" data-chat-company="${j.company_id || j.Company?.id}" data-job-id="${j.id}" data-company-name="${escapeHtml(compName)}">💬 Message Company</button>` : ''}
          <button type="button" class="btn btn-danger btn-sm" data-remove-saved="${j.id}">🗑️ Remove from Saved</button>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" data-details="${j.id}">View Details</button>
      </div>
    </div>`;
}

function renderApplications() {
  const container = $('appsList');
  if (!container) return;

  // Track active tab styling
  document.querySelectorAll('.app-tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === currentAppTab);
    btn.setAttribute('aria-selected', String(btn.dataset.tab === currentAppTab));
  });

  if (currentAppTab === 'saved') {
    if (!cachedSavedJobs.length) {
      container.innerHTML = `
        <div class="card empty-dashboard-card" style="text-align:center;padding:2.5rem 1rem;">
          <div style="font-size:2.5rem;margin-bottom:0.5rem;">🔖</div>
          <h3>No Saved Jobs Yet</h3>
          <p class="muted">Click the heart/save button on any job listing to save it here for later.</p>
          <a class="btn btn-primary mt-3" href="#/jobs">Browse Jobs</a>
        </div>`;
      return;
    }
    container.innerHTML = cachedSavedJobs.map(renderSavedJobCard).join('');
    wireApplicationListButtons();
    return;
  }

  let list = cachedApplications;
  if (currentAppTab === 'applied') {
    list = list.filter((a) => a.status === 'Applied' || a.status === 'Under Review');
  } else if (currentAppTab === 'interview') {
    list = list.filter((a) => a.status === 'Interview' || a.status === 'Shortlisted');
  } else if (currentAppTab === 'archived') {
    list = list.filter((a) => a.status === 'Archived' || a.status === 'Rejected');
  }

  if (!list.length) {
    const tabLabels = {
      all: 'applications',
      applied: 'active applied applications',
      interview: 'shortlisted or interview invitations',
      archived: 'archived applications'
    };
    container.innerHTML = `
      <div class="card empty-dashboard-card" style="text-align:center;padding:2.5rem 1rem;">
        <div style="font-size:2.5rem;margin-bottom:0.5rem;">📋</div>
        <h3>No ${tabLabels[currentAppTab] || 'applications'} found</h3>
        <p class="muted">Explore open positions and apply with your verified HireFlow resume.</p>
        <a class="btn btn-primary mt-3" href="#/jobs">Browse Jobs</a>
      </div>`;
    return;
  }

  container.innerHTML = list.map(renderApplicationCard).join('');
  wireApplicationListButtons();
}

function wireApplicationListButtons() {
  const container = $('appsList');
  if (!container) return;

  // Archive toggle
  container.querySelectorAll('[data-archive-app]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const res = await api(`/api/applications/${btn.dataset.archiveApp}/archive`, { method: 'PUT' });
        toast(res.message || 'Status updated');
        loadApplications();
      } catch (err) {
        toast(err.message);
      }
    });
  });

  // Remove saved
  container.querySelectorAll('[data-remove-saved]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await toggleSaveJob(btn.dataset.removeSaved);
    });
  });

  // Message company
  container.querySelectorAll('[data-chat-company]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openChatModal(btn.dataset.chatCompany, { id: btn.dataset.jobId }, { name: btn.dataset.companyName });
    });
  });

  // Generic job buttons (apply, save, details)
  wireJobButtons(container);
}

// Wire Application Tab navigation clicks
document.querySelectorAll('.app-tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentAppTab = btn.dataset.tab;
    renderApplications();
  });
});

async function loadProfile() {
  try {
    const res = await api('/api/users/me');
    const skills = skillList(res.data.skills);
    const tags = skills.map((s) => `<span class="skill-tag">${s}</span>`).join('') || '<span class="muted">No skills detected yet — upload a text-based resume.</span>';
    
    if ($('profileNameInput')) $('profileNameInput').value = res.data.name || '';
    if ($('profileEmailInput')) $('profileEmailInput').value = res.data.email || '';
    if ($('profileSkillsBox')) $('profileSkillsBox').innerHTML = tags;
    if ($('resumeLink')) $('resumeLink').innerHTML = res.data.resume_url ? `<p><a href="${res.data.resume_url}" target="_blank">View current resume</a></p>` : '<span class="muted">No resume uploaded yet</span>';
  } catch (err) { toast(err.message); }
}

$('profileUpdateForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('profileNameInput').value.trim();
  if (!name) return toast('Name is required');
  try {
    const res = await api('/api/users/profile', { method: 'PUT', body: JSON.stringify({ name }) });
    localStorage.setItem('name', res.data.name);
    renderNav();
    toast('Profile name updated successfully');
  } catch (err) { toast(err.message); }
});

$('changePasswordForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPassword = $('currentPwInput').value;
  const newPassword = $('newPwInput').value;
  const confirmPassword = $('confirmNewPwInput').value;

  if (newPassword !== confirmPassword) return toast('New passwords do not match');
  if (newPassword.length < 6) return toast('New password must be at least 6 characters');

  try {
    await api('/api/users/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    toast('Password updated successfully');
    e.target.reset();
  } catch (err) { toast(err.message); }
});

$('resumeForm').addEventListener('submit', uploadResume('resumeFile', () => { candidateProfileCache = null; loadProfile(); location.hash = '#/dashboard'; }));

// Candidate Danger Zone actions
$('btnSuspendCandidate')?.addEventListener('click', () => openAccountActionModal('suspend', 'candidate'));
$('btnDeleteCandidate')?.addEventListener('click', () => openAccountActionModal('delete', 'candidate'));

// ---------- Apply Modal & Resume Selection Flow ----------
$('optHireFlow')?.addEventListener('change', () => {
  $('optHireFlowCard')?.classList.add('selected');
  $('optUploadCard')?.classList.remove('selected');
  $('applyUploadSection')?.classList.add('hidden');
});
$('optUpload')?.addEventListener('change', () => {
  $('optUploadCard')?.classList.add('selected');
  $('optHireFlowCard')?.classList.remove('selected');
  $('applyUploadSection')?.classList.remove('hidden');
});
$('applyModalClose')?.addEventListener('click', () => $('applyModal')?.classList.add('hidden'));
$('applyCancelBtn')?.addEventListener('click', () => $('applyModal')?.classList.add('hidden'));

$('btnPreviewHireFlowResume')?.addEventListener('click', () => showHireFlowResumeModal());
$('btnDashViewHireFlowResume')?.addEventListener('click', () => showHireFlowResumeModal());
$('btnProfileViewHireFlowResume')?.addEventListener('click', () => showHireFlowResumeModal());
$('resumeModalClose')?.addEventListener('click', () => $('hireflowResumeModal')?.classList.add('hidden'));
$('btnCloseResume')?.addEventListener('click', () => $('hireflowResumeModal')?.classList.add('hidden'));
$('btnPrintResume')?.addEventListener('click', () => window.print());

// HireFlow Resume Mode toggles
$('btnEditHireFlowResume')?.addEventListener('click', () => switchHireFlowModalMode('edit'));
$('btnQuickEditResume')?.addEventListener('click', () => switchHireFlowModalMode('edit'));
$('btnPreviewModeHireFlowResume')?.addEventListener('click', () => switchHireFlowModalMode('preview'));
$('btnCancelEditResume')?.addEventListener('click', () => switchHireFlowModalMode('preview'));

// HireFlow Resume Dynamic Repeater Adders
$('btnAddExpItem')?.addEventListener('click', () => {
  $('hfEditExpItems')?.appendChild(createExpItemEl({}));
});
$('btnAddEduItem')?.addEventListener('click', () => {
  $('hfEditEduItems')?.appendChild(createEduItemEl({}));
});
$('btnAddProjItem')?.addEventListener('click', () => {
  $('hfEditProjItems')?.appendChild(createProjItemEl({}));
});
$('btnAddCertItem')?.addEventListener('click', () => {
  $('hfEditCertItems')?.appendChild(createCertItemEl({}));
});

// HireFlow Resume Save Form Submission
$('hfEditResumeForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const saveBtn = $('btnSaveResume');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving Resume...';
  }

  // Collect repeater items
  const experience = [];
  document.querySelectorAll('#hfEditExpItems .hf-repeater-item').forEach((row) => {
    const title = row.querySelector('.exp-title')?.value.trim();
    const company = row.querySelector('.exp-company')?.value.trim();
    if (title || company) {
      experience.push({
        title,
        company,
        location: row.querySelector('.exp-location')?.value.trim() || '',
        startDate: row.querySelector('.exp-start')?.value.trim() || '',
        endDate: row.querySelector('.exp-end')?.value.trim() || '',
        description: row.querySelector('.exp-desc')?.value.trim() || ''
      });
    }
  });

  const education = [];
  document.querySelectorAll('#hfEditEduItems .hf-repeater-item').forEach((row) => {
    const degree = row.querySelector('.edu-degree')?.value.trim();
    const institution = row.querySelector('.edu-inst')?.value.trim();
    if (degree || institution) {
      education.push({
        degree,
        institution,
        year: row.querySelector('.edu-year')?.value.trim() || '',
        grade: row.querySelector('.edu-grade')?.value.trim() || ''
      });
    }
  });

  const projects = [];
  document.querySelectorAll('#hfEditProjItems .hf-repeater-item').forEach((row) => {
    const title = row.querySelector('.proj-title')?.value.trim();
    if (title) {
      projects.push({
        title,
        techStack: row.querySelector('.proj-tech')?.value.trim() || '',
        link: row.querySelector('.proj-link')?.value.trim() || '',
        description: row.querySelector('.proj-desc')?.value.trim() || ''
      });
    }
  });

  const certifications = [];
  document.querySelectorAll('#hfEditCertItems .hf-repeater-item').forEach((row) => {
    const name = row.querySelector('.cert-name')?.value.trim();
    if (name) {
      certifications.push({
        name,
        issuer: row.querySelector('.cert-issuer')?.value.trim() || '',
        year: row.querySelector('.cert-year')?.value.trim() || ''
      });
    }
  });

  const skills = ($('hfEditSkillsInput')?.value || '').split(',').map((s) => s.trim()).filter(Boolean);
  const name = $('hfEditNameInput')?.value.trim();

  const payload = {
    name,
    headline: $('hfEditHeadlineInput')?.value.trim() || '',
    phone: $('hfEditPhoneInput')?.value.trim() || '',
    location: $('hfEditLocationInput')?.value.trim() || '',
    website: $('hfEditWebsiteInput')?.value.trim() || '',
    linkedin: $('hfEditLinkedInInput')?.value.trim() || '',
    github: $('hfEditGitHubInput')?.value.trim() || '',
    summary: $('hfEditSummaryInput')?.value.trim() || '',
    skills,
    experience,
    education,
    projects,
    certifications
  };

  try {
    const res = await api('/api/users/hireflow-resume', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    candidateProfileCache = res.data;
    if (name) {
      localStorage.setItem('name', name);
      renderNav();
    }
    toast('🌟 HireFlow Resume saved successfully!');
    renderHireFlowResumeView(res.data);
    switchHireFlowModalMode('preview');
    if (location.hash === '#/profile') loadProfile();
    if (location.hash === '#/dashboard') loadCandidateDashboard();
  } catch (err) {
    toast(err.message);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Save HireFlow Resume';
    }
  }
});

$('applyResumeFile')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    $('applyUploadStatus').textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
  }
});

$('jobApplicationForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!applyingJob) return;

  const resumeType = document.querySelector('input[name="applyResumeType"]:checked')?.value || 'hireflow';
  const note = $('applyNote')?.value || '';
  const submitBtn = $('applySubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting Application...';

  try {
    let customResumeUrl = null;
    if (resumeType === 'upload') {
      const file = $('applyResumeFile')?.files[0];
      if (!file) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Application';
        return toast('Please choose a resume file (.pdf, .docx)');
      }
      toast('Uploading customized resume...');
      const fd = new FormData();
      fd.append('resume', file);
      const uploadRes = await api('/api/users/resume', { method: 'POST', body: fd });
      customResumeUrl = uploadRes.data.resume_url;
      candidateProfileCache = null;
    }

    await api('/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        job_id: applyingJob.id,
        resume_type: resumeType,
        resume_url: customResumeUrl,
        note
      })
    });

    toast('🎉 Application submitted successfully with your chosen resume!');
    $('applyModal')?.classList.add('hidden');
    candidateProfileCache = null;
  } catch (err) {
    toast(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Application';
  }
});

// ---------- Voice Search (Speech Recognition) ----------
function setupVoiceSearch(micBtnId, inputId, onSearchCallback) {
  const micBtn = $(micBtnId);
  const input = $(inputId);
  if (!micBtn || !input) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toast('Voice search is not supported in this browser. Please use Chrome or Edge.');
    });
    return;
  }

  let recognition = null;
  try {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      micBtn.classList.add('listening');
      micBtn.title = 'Listening... Speak now';
      toast('🎙️ Listening... Speak your job title or keyword');
    };

    recognition.onresult = (event) => {
      if (event.results && event.results[0] && event.results[0][0]) {
        const transcript = event.results[0][0].transcript;
        input.value = transcript;
        toast(`Voice input: "${transcript}"`);
        if (onSearchCallback) onSearchCallback();
      }
    };

    recognition.onerror = (event) => {
      micBtn.classList.remove('listening');
      if (event.error !== 'no-speech') {
        toast('Voice search: ' + (event.error || 'Could not recognize speech'));
      }
    };

    recognition.onend = () => {
      micBtn.classList.remove('listening');
      micBtn.title = 'Search by voice';
    };

    micBtn.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        recognition.start();
      } catch (err) {
        recognition.stop();
      }
    });
  } catch (err) {
    console.warn('Speech recognition error:', err);
  }
}

// ---------- Password Show/Hide Toggle ----------
function wirePasswordToggles() {
  document.querySelectorAll('.btn-toggle-pw').forEach((btn) => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = 'true';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrap = btn.closest('.password-wrap');
      if (!wrap) return;
      const input = wrap.querySelector('input');
      if (!input) return;
      const isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
      const openEye = btn.querySelector('.eye-open');
      const closedEye = btn.querySelector('.eye-closed');
      if (openEye) openEye.classList.toggle('hidden', isPw);
      if (closedEye) closedEye.classList.toggle('hidden', !isPw);
      btn.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
    });
  });
}

// ---------- company: dashboard / jobs / applications ----------
let coJobsCache = [];

function companyJobCard(j) {
  const skills = skillList(j.skills);
  const skillBadges = skills.slice(0, 4).map((s) => `<span class="skill-tag">${s}</span>`).join('');
  const extraSkills = skills.length > 4 ? `<span class="pill">+${skills.length - 4}</span>` : '';
  const appCount = j.applications_count || 0;
  const rawDate = j.createdAt || j.created_at;
  const postedDate = (rawDate && !isNaN(new Date(rawDate).getTime()))
    ? new Date(rawDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return `
    <div class="card job-card company-card">
      <div class="card-top">
        <div>
          <span class="pill">${j.employment_type || 'Full-time'}</span>
          <span class="pill muted">${j.location || 'Remote'}</span>
        </div>
        <span class="pill ${appBadgeClass}">${appCount} ${appCount === 1 ? 'Applicant' : 'Applicants'}</span>
      </div>
      <h3 class="job-card-title">${j.title}</h3>
      <p class="job-card-desc muted">${j.description ? (j.description.length > 120 ? j.description.slice(0, 120) + '...' : j.description) : 'No description provided.'}</p>
      <div class="card-skills">
        ${skillBadges} ${extraSkills}
      </div>
      <div class="card-footer">
        ${postedDate ? `<span class="muted font-xs">Posted: ${postedDate}</span>` : '<span class="spacer"></span>'}
        <div class="job-actions">
          <a class="btn btn-ghost btn-sm" href="#/company/applications" title="View candidates for this job">Applicants (${appCount})</a>
          <a class="btn btn-sm" href="#/company/jobs/${j.id}/edit">Edit</a>
          <button class="btn btn-danger btn-sm" data-del="${j.id}">Delete</button>
        </div>
      </div>
    </div>`;
}

const emptyCompanyJobsState = `
  <div class="card empty-dashboard-card span-all">
    <div class="empty-icon">💼</div>
    <h3>No Jobs Posted Yet</h3>
    <p class="muted">Publish your first job vacancy to start receiving qualified candidates and AI-matched resumes.</p>
    <a class="btn btn-secondary mt-3" href="#/company/jobs/create">+ Post Your First Job</a>
  </div>`;

function wireCompanyDeleteButtons(reloadFn) {
  document.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('Delete this job? Applications for it will also be removed.')) return;
    try {
      await api(`/api/company/jobs/${b.dataset.del}`, { method: 'DELETE' });
      toast('Job deleted');
      reloadFn();
    } catch (err) {
      toast(err.message);
    }
  }));
}

async function loadDashboard() {
  try {
    const [jobsRes, appsRes] = await Promise.all([api('/api/company/jobs'), api('/api/company/applications')]);
    coJobsCache = jobsRes.data || [];
    const apps = appsRes.data || [];
    const inReview = apps.filter((a) => a.status === 'Under Review' || a.status === 'Applied').length;

    $('dashWelcome').textContent = `Welcome, ${session().name || 'Partner'}`;
    $('statJobs').textContent = coJobsCache.length;
    $('statApps').textContent = apps.length;
    const statReviewEl = $('statUnderReview');
    if (statReviewEl) statReviewEl.textContent = inReview;

    const targetEl = $('companyDashJobs') || $('dashJobs');
    if (targetEl) {
      targetEl.innerHTML = coJobsCache.length ? coJobsCache.map(companyJobCard).join('') : emptyCompanyJobsState;
    }
    wireCompanyDeleteButtons(loadDashboard);
  } catch (err) { toast(err.message); }
}

async function loadCompanyJobs() {
  try {
    const res = await api('/api/company/jobs');
    coJobsCache = res.data || [];
    $('companyJobsList').innerHTML = coJobsCache.length ? coJobsCache.map(companyJobCard).join('') : emptyCompanyJobsState;
    wireCompanyDeleteButtons(loadCompanyJobs);
  } catch (err) { toast(err.message); }
}
let editingJobId = null;
async function openJobForm(id) {
  editingJobId = id || null;
  $('jobFormTitle').textContent = id ? 'Edit Job' : 'Post a Job';
  $('jobFormCompany').textContent = session().name || '';
  $('companyJobForm').querySelector('button[type=submit]').textContent = id ? 'Save Changes' : 'Post Job';
  if (!id) { $('companyJobForm').reset(); return; }
  try {
    const res = await api(`/api/company/jobs/${id}`);
    $('cjTitle').value = res.data.title || '';
    $('cjLocation').value = res.data.location || '';
    $('cjType').value = res.data.employment_type || '';
    $('cjDesc').value = res.data.description || '';
    $('cjSkills').value = skillList(res.data.skills).join(', ');
  } catch (err) { toast(err.message); location.hash = '#/company/jobs'; }
}
$('companyJobForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = JSON.stringify({ title: $('cjTitle').value, description: $('cjDesc').value, location: $('cjLocation').value, employment_type: $('cjType').value, skills: $('cjSkills').value });
  try {
    if (editingJobId) {
      await api(`/api/company/jobs/${editingJobId}`, { method: 'PUT', body });
      toast('Job updated'); location.hash = '#/company/jobs';
    } else {
      await api('/api/company/jobs', { method: 'POST', body });
      toast('Job posted'); location.hash = '#/company/dashboard';
    }
  } catch (err) { toast(err.message); }
});
let coAppsCache = [];
async function loadCompanyApplications() {
  try {
    const [jobsRes, appsRes] = await Promise.all([api('/api/company/jobs'), api('/api/company/applications')]);
    coAppsCache = appsRes.data || [];
    $('appJobFilter').innerHTML = '<option value="">All jobs</option>' + (jobsRes.data || []).map((j) => `<option value="${j.id}">${j.title}</option>`).join('');
    renderCompanyApps();
  } catch (err) { toast(err.message); }
}
function renderCompanyApps() {
  const jf = $('appJobFilter').value, sf = $('appStatusFilter').value;
  const rows = coAppsCache.filter((a) => (!jf || a.job?.id === jf) && (!sf || a.status === sf));
  $('companyAppsList').innerHTML = rows.length ? rows.map((a) => {
    const resumeLabel = a.resume_type === 'custom' ? 'Custom Uploaded Resume' : '🌟 HireFlow Profile Resume';
    const appDate = a.applied_at || a.createdAt;
    const appDateStr = (appDate && !isNaN(new Date(appDate).getTime()))
      ? new Date(appDate).toLocaleString()
      : 'Recently';
    return `
      <div class="card">
        <div class="card-top">
          <div>
            <b>${escapeHtml(a.candidate?.name || 'Applicant')}</b>
            <span class="muted font-xs"> (${escapeHtml(a.candidate?.email || '')})</span>
          </div>
          <span class="pill ${STATUS_CLASS[a.status] || ''}">${a.status}</span>
        </div>
        <div class="muted mt-2">Applied for <b>${escapeHtml(a.job?.title || '')}</b> • ${appDateStr}</div>
        ${a.note ? `<div class="mt-2 font-xs muted"><b>Note:</b> ${escapeHtml(a.note)}</div>` : ''}
        ${skills.length ? `<div class="card-skills mt-2">${skills.slice(0, 6).map((s) => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
        <div class="card-footer mt-3">
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap;align-items:center;">
            ${a.candidate ? `<button type="button" class="btn btn-secondary btn-sm" data-view-hf-app="${a.id}">🌟 View HireFlow Resume</button>` : ''}
            ${a.resume_url ? `<a href="${a.resume_url}" target="_blank" class="btn btn-ghost btn-sm">📄 Original File</a>` : ''}
          </div>
          <div class="job-actions" style="flex-wrap:wrap;">
            ${a.candidate?.id ? `<button type="button" class="btn btn-secondary btn-sm" data-chat-candidate="${a.candidate.id}" data-candidate-name="${escapeHtml(a.candidate.name)}" data-job-id="${a.job?.id || ''}">💬 Message Candidate</button>` : ''}
            <select data-status="${a.id}">
              ${['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Rejected', 'Archived'].map((s) => `<option ${s === a.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>`;
  }).join('')
    : '<p class="muted">No applications found.</p>';

  document.querySelectorAll('[data-view-hf-app]').forEach((btn) => btn.addEventListener('click', () => {
    const app = coAppsCache.find((x) => x.id === btn.dataset.viewHfApp);
    if (app && app.candidate) {
      showHireFlowResumeModal(app.candidate, false);
    }
  }));

  document.querySelectorAll('[data-chat-candidate]').forEach((btn) => btn.addEventListener('click', () => {
    openChatModal(btn.dataset.chatCandidate, { id: btn.dataset.jobId }, { name: btn.dataset.candidateName });
  }));

  document.querySelectorAll('[data-status]').forEach((sel) => sel.addEventListener('change', async () => {
    try {
      await api(`/api/company/applications/${sel.dataset.status}/status`, { method: 'PUT', body: JSON.stringify({ status: sel.value }) });
      toast(`Status → ${sel.value}`);
      const row = coAppsCache.find((a) => a.id === sel.dataset.status);
      if (row) row.status = sel.value;
      renderCompanyApps();
    } catch (err) { toast(err.message); }
  }));
}
$('appJobFilter').addEventListener('change', renderCompanyApps);
$('appStatusFilter').addEventListener('change', renderCompanyApps);

// Company Account Settings & Danger Zone
$('companyChangePwForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPassword = $('coCurrentPw')?.value || '';
  const newPassword = $('coNewPw')?.value || '';
  const confirmPassword = $('coConfirmPw')?.value || '';

  if (newPassword !== confirmPassword) return toast('New passwords do not match');
  if (newPassword.length < 6) return toast('New password must be at least 6 characters');

  try {
    await api('/api/company/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    toast('Organization password updated successfully');
    e.target.reset();
  } catch (err) { toast(err.message); }
});

$('btnSuspendCompany')?.addEventListener('click', () => openAccountActionModal('suspend', 'company'));
$('btnDeleteCompany')?.addEventListener('click', () => openAccountActionModal('delete', 'company'));

// ==========================================================================
// Direct Messaging & Real-Time Chat Management
// ==========================================================================
let activeThreadOtherId = null;
let activeThreadJobId = null;
let activeThreadOtherParty = null;
let conversationsCache = [];

async function loadConversations() {
  if (!session().token) return;
  try {
    const res = await api('/api/messages/conversations');
    conversationsCache = res.data?.conversations || [];
    const totalUnread = res.data?.total_unread || 0;

    const badge = $('msgBadge');
    if (badge) {
      badge.textContent = totalUnread > 9 ? '9+' : totalUnread;
      badge.classList.toggle('hidden', totalUnread === 0);
    }
    const mMsgCount = $('mMsgCount');
    if (mMsgCount) mMsgCount.textContent = totalUnread;

    renderConversationsList();
  } catch (err) {
    if (!err.message?.includes('429')) console.warn('Error loading conversations:', err);
  }
}

function renderConversationsList() {
  const listEl = $('chatConversationsList');
  if (!listEl) return;
  const kw = ($('chatSearchInput')?.value || '').trim().toLowerCase();
  let list = conversationsCache;
  if (kw) {
    list = list.filter((c) => `${c.party?.name || ''} ${c.lastMessage || ''} ${c.job?.title || ''}`.toLowerCase().includes(kw));
  }

  if (!list.length) {
    listEl.innerHTML = `<div class="chat-empty-conversations">${kw ? 'No conversations match search.' : 'No conversations yet.<br/><span class="font-xs muted">Start chatting from any job or application.</span>'}</div>`;
    return;
  }

  listEl.innerHTML = list.map((c) => {
    const name = c.party?.name || (c.otherType === 'company' ? 'Company' : 'Candidate');
    const avatarLetter = (name[0] || '?').toUpperCase();
    const isActive = activeThreadOtherId === c.otherId;
    const timeStr = timeAgo(c.lastMessageAt);
    const unread = c.unreadCount > 0 ? `<span class="chat-conv-unread">${c.unreadCount}</span>` : '';
    const jobTag = c.job ? `<span class="pill font-xs" style="font-size:0.68rem;padding:0.05rem 0.45rem;">${escapeHtml(c.job.title)}</span>` : '';

    return `
      <div class="chat-conv-item ${isActive ? 'active' : ''}" data-conv-id="${c.otherId}">
        <div class="chat-avatar">${avatarLetter}</div>
        <div class="chat-conv-info">
          <div class="chat-conv-name-row">
            <span class="chat-conv-name">${escapeHtml(name)}</span>
            <span class="chat-conv-time">${timeStr}</span>
          </div>
          <div class="chat-conv-last-msg">
            <span>${c.lastMessage ? (c.lastMessage.length > 28 ? escapeHtml(c.lastMessage.slice(0, 28)) + '...' : escapeHtml(c.lastMessage)) : 'New conversation'}</span>
            ${unread}
          </div>
          ${jobTag ? `<div style="margin-top:0.25rem;">${jobTag}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  listEl.querySelectorAll('[data-conv-id]').forEach((el) => {
    el.addEventListener('click', () => {
      const conv = conversationsCache.find((c) => c.otherId === el.dataset.convId);
      openThread(el.dataset.convId, conv?.party, conv?.job);
    });
  });
}

async function openChatModal(otherId = null, job = null, initialParty = null) {
  if (!session().token) {
    toast('Please log in to use chat');
    location.hash = '#/login';
    return;
  }
  $('chatModal')?.classList.remove('hidden');
  await loadConversations();
  if (otherId) {
    openThread(otherId, initialParty, job);
  }
}

async function openThread(otherId, partyInfo = null, job = null) {
  activeThreadOtherId = otherId;
  if (job) activeThreadJobId = job.id;
  activeThreadOtherParty = partyInfo;

  renderConversationsList();

  const partyName = partyInfo?.name || (isCandidate() ? 'Company Team' : 'Applicant');
  $('chatActiveName').textContent = partyName;
  $('chatActiveAvatar').textContent = (partyName[0] || '?').toUpperCase();
  $('chatActiveSubtitle').textContent = job ? `Regarding: ${job.title}` : (partyInfo?.email || 'Active discussion');

  $('chatSendForm')?.classList.remove('hidden');
  $('chatThreadContainer')?.classList.add('active-mobile');
  $('chatSidebar')?.classList.add('inactive-mobile');

  await refreshThreadMessages();
  setTimeout(() => $('chatMsgInput')?.focus(), 100);
}

async function refreshThreadMessages() {
  if (!activeThreadOtherId) return;
  try {
    const res = await api(`/api/messages/thread/${activeThreadOtherId}`);
    const messages = res.data?.messages || [];
    const other = res.data?.otherParty;
    if (other && !activeThreadOtherParty) {
      activeThreadOtherParty = other;
      $('chatActiveName').textContent = other.name;
      $('chatActiveAvatar').textContent = (other.name[0] || '?').toUpperCase();
    }

    const role = session().role;
    const bodyEl = $('chatMessagesBody');
    if (!messages.length) {
      bodyEl.innerHTML = `<div class="chat-placeholder-state"><div class="chat-placeholder-icon">👋</div><h4>Say Hello!</h4><p class="muted">Send a message to start this conversation.</p></div>`;
      return;
    }

    bodyEl.innerHTML = messages.map((m) => {
      const isOutgoing = m.sender_type === role;
      const rawDate = m.createdAt || m.created_at;
      const timeStr = formatChatTime(rawDate);
      return `
        <div class="chat-msg-row ${isOutgoing ? 'outgoing' : 'incoming'}">
          <div class="chat-bubble">${escapeHtml(m.content)}</div>
          <span class="chat-time">${timeStr}</span>
        </div>`;
    }).join('');

    bodyEl.scrollTop = bodyEl.scrollHeight;
    loadConversations();
  } catch (err) {
    console.warn('Error loading thread:', err);
  }
}

async function sendChatMessage(content) {
  if (!content || !content.trim() || !activeThreadOtherId) return;
  const text = content.trim();
  $('chatMsgInput').value = '';

  // Optimistic message append
  const bodyEl = $('chatMessagesBody');
  const tempRow = document.createElement('div');
  tempRow.className = 'chat-msg-row outgoing';
  tempRow.innerHTML = `<div class="chat-bubble">${escapeHtml(text)}</div><span class="chat-time">Just now</span>`;
  bodyEl.appendChild(tempRow);
  bodyEl.scrollTop = bodyEl.scrollHeight;

  try {
    await api('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        recipient_id: activeThreadOtherId,
        content: text,
        job_id: activeThreadJobId || undefined
      })
    });
    refreshThreadMessages();
  } catch (err) {
    toast('Failed to send message: ' + err.message);
  }
}

// Wire Chat Modal events
$('chatModalClose')?.addEventListener('click', () => $('chatModal')?.classList.add('hidden'));
$('chatCloseThreadBtn')?.addEventListener('click', () => $('chatModal')?.classList.add('hidden'));
$('chatBackBtn')?.addEventListener('click', () => {
  $('chatThreadContainer')?.classList.remove('active-mobile');
  $('chatSidebar')?.classList.remove('inactive-mobile');
});
$('chatSearchInput')?.addEventListener('input', () => renderConversationsList());
$('chatSendForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  sendChatMessage($('chatMsgInput')?.value);
});
$('msgToggleBtn')?.addEventListener('click', () => openChatModal());

// ==========================================================================
// Notifications System
// ==========================================================================
async function loadNotifications() {
  if (!session().token) return;
  try {
    const res = await api('/api/notifications');
    const notifs = res.data?.notifications || [];
    const unreadCount = res.data?.unread_count || 0;

    const badge = $('notifBadge');
    if (badge) {
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.classList.toggle('hidden', unreadCount === 0);
    }
    const mNotifCount = $('mNotifCount');
    if (mNotifCount) mNotifCount.textContent = unreadCount;

    const listEl = $('notifList');
    if (!listEl) return;

    if (!notifs.length) {
      listEl.innerHTML = '<div class="notif-empty">No notifications yet</div>';
      return;
    }

    listEl.innerHTML = notifs.map((n) => {
      const icon = n.type === 'message' ? '💬' : n.type === 'status_change' ? '📢' : n.type === 'application' ? '📄' : '🔔';
      return `
        <div class="notif-item ${n.is_read ? '' : 'unread'}" data-notif-id="${n.id}" data-link="${n.link || ''}">
          <div class="notif-icon-circle">${icon}</div>
          <div class="notif-content">
            <div class="notif-title">${escapeHtml(n.title)}</div>
            <div class="notif-desc">${escapeHtml(n.message)}</div>
            <div class="notif-time">${timeAgo(n.createdAt || n.created_at)}</div>
          </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('[data-notif-id]').forEach((el) => {
      el.addEventListener('click', async () => {
        const id = el.dataset.notifId;
        const link = el.dataset.link;
        await api(`/api/notifications/${id}/read`, { method: 'PUT' }).catch(() => {});
        $('notifDropdown')?.classList.add('hidden');
        loadNotifications();
        if (link === '#/chat') {
          openChatModal();
        } else if (link) {
          location.hash = link;
        }
      });
    });
  } catch (err) {
    if (!err.message?.includes('429')) console.warn('Error loading notifications:', err);
  }
}

$('notifToggleBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const dropdown = $('notifDropdown');
  if (dropdown) dropdown.classList.toggle('hidden');
});
$('notifMarkAllRead')?.addEventListener('click', async (e) => {
  e.stopPropagation();
  try {
    await api('/api/notifications/read-all', { method: 'PUT' });
    toast('All notifications marked as read');
    loadNotifications();
  } catch (err) {
    toast(err.message);
  }
});

// Close dropdown or modal when clicking outside
document.addEventListener('click', (e) => {
  const notifWrap = $('notifWrap');
  if (notifWrap && !notifWrap.contains(e.target)) {
    $('notifDropdown')?.classList.add('hidden');
  }
  const chatModal = $('chatModal');
  if (chatModal && e.target === chatModal) {
    chatModal.classList.add('hidden');
  }
  const actModal = $('accountActionModal');
  if (actModal && e.target === actModal) {
    closeAccountActionModal();
  }
});

// ==========================================================================
// Account Action Modal (Suspend / Delete Account)
// ==========================================================================
let accountModalAction = null; // 'suspend' | 'delete'
let accountModalRole = null;   // 'candidate' | 'company'

function openAccountActionModal(actionType, role) {
  accountModalAction = actionType;
  accountModalRole = role;

  const isSuspend = actionType === 'suspend';
  const isCandidateUser = role === 'candidate';

  const modal = $('accountActionModal');
  const icon = $('accountActionIcon');
  const badge = $('accountActionBadge');
  const title = $('accountActionTitle');
  const desc = $('accountActionDesc');
  const submitBtn = $('accountActionSubmit');
  const errBox = $('accountActionError');
  const pwInput = $('accountActionPassword');

  if (errBox) {
    errBox.textContent = '';
    errBox.classList.add('hidden');
  }
  if (pwInput) pwInput.value = '';

  if (isSuspend) {
    if (badge) {
      badge.textContent = '⏸️ Temporary Suspension';
      badge.style.background = 'rgba(217, 119, 6, 0.15)';
      badge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
      badge.style.color = '#fde68a';
    }
    if (icon) icon.textContent = '⏸️';
    if (title) title.textContent = isCandidateUser ? 'Suspend Candidate Account' : 'Suspend Organization Account';
    if (desc) {
      desc.textContent = isCandidateUser
        ? 'Your profile, applications, and visibility will be temporarily paused. You can easily reactivate your account anytime simply by logging back in with your credentials.'
        : 'Your company profile and job postings will be paused. Logging back in anytime will automatically reactivate your organization.';
    }
    if (submitBtn) {
      submitBtn.textContent = 'Confirm Account Suspension';
      submitBtn.className = 'btn btn-warn';
      submitBtn.disabled = false;
    }
  } else {
    if (badge) {
      badge.textContent = '⚠️ Permanent Deletion';
      badge.style.background = 'rgba(239, 68, 68, 0.15)';
      badge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      badge.style.color = '#fca5a5';
    }
    if (icon) icon.textContent = '🗑️';
    if (title) title.textContent = isCandidateUser ? 'Delete Candidate Account' : 'Delete Organization Account';
    if (desc) {
      desc.textContent = isCandidateUser
        ? 'Permanently delete your candidate profile, uploaded resume, application history, and messages. This action CANNOT be reversed.'
        : 'Permanently delete your company, all published jobs, applicant records, and conversation history. This action CANNOT be reversed.';
    }
    if (submitBtn) {
      submitBtn.textContent = 'Permanently Delete My Account';
      submitBtn.className = 'btn btn-danger';
      submitBtn.disabled = false;
    }
  }

  modal?.classList.remove('hidden');
  wirePasswordToggles();
}

function closeAccountActionModal() {
  const modal = $('accountActionModal');
  if (modal) modal.classList.add('hidden');
  const pw = $('accountActionPassword');
  if (pw) pw.value = '';
  const errBox = $('accountActionError');
  if (errBox) {
    errBox.textContent = '';
    errBox.classList.add('hidden');
  }
}

$('accountActionClose')?.addEventListener('click', closeAccountActionModal);
$('accountActionCancel')?.addEventListener('click', closeAccountActionModal);

$('accountActionForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = $('accountActionPassword')?.value || '';
  if (!password) {
    const errBox = $('accountActionError');
    if (errBox) {
      errBox.textContent = 'Please enter your password to confirm.';
      errBox.classList.remove('hidden');
    }
    return;
  }

  const submitBtn = $('accountActionSubmit');
  const isSuspend = accountModalAction === 'suspend';
  const isCandidateUser = accountModalRole === 'candidate';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
  }

  let endpoint = '';
  let method = '';
  if (isCandidateUser) {
    endpoint = isSuspend ? '/api/users/suspend' : '/api/users/account';
    method = isSuspend ? 'PUT' : 'DELETE';
  } else {
    endpoint = isSuspend ? '/api/company/suspend' : '/api/company/account';
    method = isSuspend ? 'PUT' : 'DELETE';
  }

  try {
    const res = await api(endpoint, {
      method,
      body: JSON.stringify({ password })
    });

    closeAccountActionModal();
    toast(res.message || (isSuspend ? 'Account suspended successfully' : 'Account permanently deleted'));

    // Clear session & log out
    ['token', 'role', 'email', 'name'].forEach((k) => localStorage.removeItem(k));
    savedJobIdsSet.clear();
    cachedApplications = [];
    cachedSavedJobs = [];
    conversationsCache = [];
    renderNav();
    location.hash = isCandidateUser ? '#/login' : '#/company/login';
  } catch (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = isSuspend ? 'Confirm Account Suspension' : 'Permanently Delete My Account';
    }
    const errBox = $('accountActionError');
    if (errBox) {
      errBox.textContent = err.message || 'Verification failed. Please check your password.';
      errBox.classList.remove('hidden');
    }
  }
});

// Real-time Background Poller (every 15s, paused when tab is inactive)
setInterval(() => {
  if (document.hidden) return;
  if (session().token) {
    loadNotifications();
    loadConversations();
    if ($('chatModal') && !$('chatModal').classList.contains('hidden') && activeThreadOtherId) {
      refreshThreadMessages();
    }
  }
}, 15000);

// ---------- init ----------
wirePasswordToggles();
setupVoiceSearch('jobMicBtn', 'jobKeyword', () => { page = 1; loadJobs(); });
setupVoiceSearch('dashMicBtn', 'dashSearchKeyword', () => { renderCandidateDashboardJobs(); });
renderNav();
route();
