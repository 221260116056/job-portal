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

// ---------- navigation ----------
const NAVS = {
  public: [['#/jobs', 'Jobs']],
  candidate: [['#/dashboard', 'Dashboard'], ['#/jobs', 'Jobs'], ['#/my-applications', 'My Applications'], ['#/profile', 'Profile']],
  company: [['#/company/dashboard', 'Dashboard'], ['#/company/jobs', 'My Jobs'], ['#/company/applications', 'Applications'], ['#/company/jobs/create', 'Post Job']],
};
function closeAuthMenu() {
  $('authMenu').classList.add('hidden');
  $('authDropBtn').setAttribute('aria-expanded', 'false');
}
function renderNav() {
  const role = isCompany() ? 'company' : isCandidate() ? 'candidate' : 'public';
  closeMobileMenu();
  $('mainNav').innerHTML = NAVS[role].map(([h, l]) => `<a class="nav-btn" href="${h}">${l}</a>`).join('');
  const { token, email, name } = session();
  const loggedOut = !token;
  $('authDropdown').classList.toggle('hidden', !loggedOut);
  if (loggedOut) closeAuthMenu();
  $('profileBtn').classList.toggle('hidden', role !== 'candidate');
  $('dashBtn').classList.toggle('hidden', role !== 'company');
  $('logoutBtn').classList.toggle('hidden', loggedOut);
  $('userBadge').classList.toggle('hidden', loggedOut);
  if (token) $('userBadge').textContent = `${role === 'company' ? '🏢' : '👤'} ${name || email}`;
}
$('authDropBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const open = $('authMenu').classList.toggle('hidden');
  $('authDropBtn').setAttribute('aria-expanded', String(!open));
});
document.addEventListener('click', (e) => {
  if (!$('authMenu').classList.contains('hidden') && !$('authDropdown').contains(e.target)) closeAuthMenu();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAuthMenu(); });
$('authMenu').addEventListener('click', (e) => { if (e.target.closest('a')) closeAuthMenu(); });
function closeMobileMenu() {
  $('mobileMenu').classList.add('hidden');
  $('menuBtn').setAttribute('aria-expanded', 'false');
}
function renderMobileMenu() {
  const role = isCompany() ? 'company' : isCandidate() ? 'candidate' : 'public';
  const links = NAVS[role].map(([h, l]) => `<a href="${h}">${l}</a>`).join('');
  let auth;
  if (role === 'public') {
    auth = `<div class="dropdown-label">Candidate</div><a href="#/login">Login</a><a href="#/register">Register</a><div class="dropdown-label">Company</div><a href="#/company/login">Company Login</a><a href="#/company/register">Company Register</a>`;
  } else if (role === 'candidate') {
    auth = `<a href="#/profile">Profile</a><a href="#" id="mLogout">Logout</a>`;
  } else {
    auth = `<a href="#/company/dashboard">Dashboard</a><a href="#" id="mLogout">Logout</a>`;
  }
  $('mobileMenu').innerHTML = links + auth;
  const out = $('mLogout');
  if (out) out.addEventListener('click', (e) => { e.preventDefault(); $('logoutBtn').click(); closeMobileMenu(); });
}
$('menuBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const willOpen = $('mobileMenu').classList.contains('hidden');
  if (willOpen) renderMobileMenu();
  $('mobileMenu').classList.toggle('hidden');
  $('menuBtn').setAttribute('aria-expanded', String(willOpen));
});
$('mobileMenu').addEventListener('click', (e) => { if (e.target.closest('a')) closeMobileMenu(); });
document.addEventListener('click', (e) => {
  if (!$('mobileMenu').classList.contains('hidden') && !$('mobileMenu').contains(e.target) && e.target !== $('menuBtn')) closeMobileMenu();
});
$('logoutBtn').addEventListener('click', () => {
  ['token', 'role', 'email', 'name'].forEach((k) => localStorage.removeItem(k));
  renderNav(); toast('Logged out'); location.hash = '#/jobs';
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
    toast('Login successful'); location.hash = '#/dashboard';
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
    toast('Company login successful'); location.hash = '#/company/dashboard';
  } catch (err) { toast(err.message); }
});

// ---------- job cards ----------
let page = 1; const limit = 9; let cache = [];
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
  return `<div class="job-card"><span class="pill">${j.employment_type || ''} • ${j.location || ''}</span><h3>${j.title}${matchBadge(j)}</h3><div class="muted">${j.company}</div>${skillsBlock(j)}<div class="job-actions"><button class="btn btn-ghost" data-details="${j.id}">View Details</button><button class="btn btn-primary" data-apply="${j.id}">Apply</button></div></div>`;
}
function trackJobs(rows) {
  rows.forEach((j) => { if (!cache.some((c) => c.id === j.id)) cache.push(j); });
}
function wireJobButtons(root = document) {
  root.querySelectorAll('[data-apply]').forEach((b) => b.addEventListener('click', async () => {
    if (!isCandidate()) { location.hash = '#/login'; return toast(isCompany() ? 'Companies cannot apply — login as a candidate' : 'Login as a candidate to apply'); }
    try { await api('/api/applications', { method: 'POST', body: JSON.stringify({ job_id: b.dataset.apply }) }); toast('Application submitted!'); }
    catch (err) { toast(err.message); }
  }));
  root.querySelectorAll('[data-details]').forEach((b) => b.addEventListener('click', () => {
    const j = cache.find((x) => x.id === b.dataset.details);
    if (!j) return;
    $('modalBody').innerHTML = `<span class="pill">${j.employment_type} • ${j.location}</span><h2>${j.title}</h2><p class="muted">${j.company}</p>${j.match_percentage > 0 ? `<p><span class="match-badge">${j.match_percentage}% Match</span> <span class="muted">on ${(j.matched_skills || []).map((s) => `✓ ${s}`).join(' · ')}</span></p>` : ''}<p>${j.description}</p><p><b>Required skills:</b> ${skillList(j.skills).join(', ') || '-'}</p><button class="btn btn-primary" id="modalApply">Apply for this job</button>`;
    $('jobModal').classList.remove('hidden');
    $('modalApply').addEventListener('click', async () => {
      if (!isCandidate()) { $('jobModal').classList.add('hidden'); location.hash = '#/login'; return toast('Login as a candidate to apply'); }
      try { await api('/api/applications', { method: 'POST', body: JSON.stringify({ job_id: j.id }) }); toast('Application submitted!'); $('jobModal').classList.add('hidden'); }
      catch (err) { toast(err.message); }
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
    trackJobs(jobs);
    if (!jobs.length) {
      $('dashJobsInfo').innerHTML = `<p class="muted">${message || 'No matching jobs found.'}</p>`;
      $('dashJobs').innerHTML = '';
    } else {
      $('dashJobsInfo').innerHTML = `<p class="muted">${message || 'Based on your resume.'}</p>`;
      $('dashJobs').innerHTML = jobs.map(jobCard).join('');
    }
    wireJobButtons();
  } catch (err) { $('dashJobsInfo').innerHTML = `<p class="muted">${err.message}</p>`; }
}
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
async function loadJobs() {
  try {
    const q = $('jobSearch').value.trim().toLowerCase();
    const res = await fetch(`/api/jobs?page=${page}&limit=${limit}`).then((r) => r.json());
    let rows = res.data || [];
    cache = rows;
    if (q) rows = rows.filter((j) => `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q));
    $('jobsGrid').innerHTML = rows.length ? rows.map(jobCard).join('') : '<p class="muted">No jobs found.</p>';
    $('pageInfo').textContent = `Page ${res.pagination?.page || page} of ${res.pagination?.totalPages || 1} (${res.pagination?.total || rows.length} jobs)`;
    wireJobButtons();
  } catch (err) { toast(err.message); }
}
$('modalClose').addEventListener('click', () => $('jobModal').classList.add('hidden'));
$('refreshJobs').addEventListener('click', loadJobs);
$('jobSearch').addEventListener('input', loadJobs);
$('prevPage').addEventListener('click', () => { if (page > 1) { page--; loadJobs(); } });
$('nextPage').addEventListener('click', () => { page++; loadJobs(); });

// ---------- candidate: applications + profile ----------
const STATUS_CLASS = { Applied: '', 'Under Review': 'warn', Shortlisted: 'good', Rejected: 'bad' };
async function loadApplications() {
  try {
    const res = await api('/api/applications');
    $('appsList').innerHTML = res.data.length ? res.data.map((a) => `<div class="card"><b>${a.Job?.title}</b> <span class="muted">@ ${a.Job?.company}</span><br/><span class="pill ${STATUS_CLASS[a.status] || ''}">${a.status}</span> <span class="muted">applied ${new Date(a.applied_at).toLocaleString()}</span></div>`).join('') : '<p class="muted">No applications yet. Apply from Jobs.</p>';
  } catch (err) { toast(err.message); }
}
async function loadProfile() {
  try {
    const res = await api('/api/users/me');
    const skills = skillList(res.data.skills);
    const tags = skills.map((s) => `<span class="skill-tag">${s}</span>`).join('') || '<span class="muted">No skills detected yet — upload a text-based resume.</span>';
    $('profileBox').innerHTML = `<p><b>${res.data.name}</b><br/>${res.data.email}<br/><span class="muted">${res.data.resume_url ? `Resume: <a href="${res.data.resume_url}" target="_blank">view</a>` : 'No resume uploaded'}</span></p><div><b>Detected skills</b><br/>${tags}</div>`;
    $('resumeLink').innerHTML = res.data.resume_url ? `<p><a href="${res.data.resume_url}" target="_blank">View current resume</a></p>` : '';
  } catch (err) { toast(err.message); }
}
$('resumeForm').addEventListener('submit', uploadResume('resumeFile', () => { loadProfile(); location.hash = '#/dashboard'; }));

// ---------- company: dashboard / jobs / applications ----------
let coJobsCache = [];
async function loadDashboard() {
  try {
    const [jobsRes, appsRes] = await Promise.all([api('/api/company/jobs'), api('/api/company/applications')]);
    coJobsCache = jobsRes.data || [];
    $('dashWelcome').textContent = `Welcome, ${session().name || ''}`;
    $('statJobs').textContent = coJobsCache.length;
    $('statApps').textContent = (appsRes.data || []).length;
    $('dashJobs').innerHTML = coJobsCache.length ? coJobsCache.map((j) => `
      <div class="card"><b>${j.title}</b> <span class="muted">• ${j.location} • ${j.employment_type}</span><br/>
      <span class="pill">${j.applications_count} Applications</span>
      <div class="job-actions"><a class="btn btn-ghost" href="#/company/applications">View Applications</a><a class="btn" href="#/company/jobs/${j.id}/edit">Edit</a></div></div>`).join('')
      : '<p class="muted">No jobs yet. Post your first job.</p>';
  } catch (err) { toast(err.message); }
}
async function loadCompanyJobs() {
  try {
    const res = await api('/api/company/jobs');
    coJobsCache = res.data || [];
    $('companyJobsList').innerHTML = coJobsCache.length ? coJobsCache.map((j) => `
      <div class="card"><b>${j.title}</b> <span class="muted">• ${j.location} • ${j.employment_type}</span><br/>
      <span class="pill">${j.applications_count} Applications</span> <span class="muted">${skillList(j.skills).join(', ')}</span>
      <div class="job-actions"><a class="btn btn-ghost" href="#/company/applications">View Applications</a><a class="btn" href="#/company/jobs/${j.id}/edit">Edit</a><button class="btn btn-danger" data-del="${j.id}">Delete</button></div></div>`).join('')
      : '<p class="muted">No jobs yet.</p>';
    document.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this job? Applications for it will also be removed.')) return;
      try { await api(`/api/company/jobs/${b.dataset.del}`, { method: 'DELETE' }); toast('Job deleted'); loadCompanyJobs(); }
      catch (err) { toast(err.message); }
    }));
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
  $('companyAppsList').innerHTML = rows.length ? rows.map((a) => `
    <div class="card"><b>${a.candidate?.name}</b> <span class="muted">${a.candidate?.email}</span><br/>
    <span class="muted">Applied for <b>${a.job?.title}</b> • ${new Date(a.applied_at).toLocaleString()}</span><br/>
    ${a.candidate?.resume_url ? `<a href="${a.candidate.resume_url}" target="_blank">View Resume</a> · ` : '<span class="muted">No resume · </span>'}
    <span class="pill ${STATUS_CLASS[a.status] || ''}">${a.status}</span>
    <div class="job-actions"><select data-status="${a.id}">${['Applied', 'Under Review', 'Shortlisted', 'Rejected'].map((s) => `<option ${s === a.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div>`).join('')
    : '<p class="muted">No applications found.</p>';
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

// ---------- init ----------
renderNav();
route();
