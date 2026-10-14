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

async function showHireFlowResumeModal(customUser = null) {
  const profile = customUser || await getCandidateProfile();
  if (!profile) return toast('Candidate profile not found. Please log in.');

  $('hfResumeName').textContent = profile.name || 'Candidate';
  $('hfResumeEmail').textContent = profile.email || '';
  
  const skills = skillList(profile.skills);
  $('hfResumeSkills').innerHTML = skills.length
    ? skills.map((s) => `<span class="skill-tag">${s}</span>`).join('')
    : '<span class="muted font-xs">No technical skills detected yet. Upload a resume to automatically extract skills.</span>';

  if (profile.resume_url) {
    $('hfResumeDocLink').innerHTML = `<a href="${profile.resume_url}" target="_blank" class="btn btn-ghost btn-sm">📄 View Original Uploaded Document</a>`;
  } else {
    $('hfResumeDocLink').textContent = 'No original document uploaded yet.';
  }

  $('hireflowResumeModal').classList.remove('hidden');
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
  root.querySelectorAll('[data-details]').forEach((b) => b.addEventListener('click', () => {
    const j = cache.find((x) => x.id === b.dataset.details);
    if (!j) return;
    $('modalBody').innerHTML = `<span class="pill">${j.employment_type} • ${j.location}</span><h2>${j.title}</h2><p class="muted">${j.company}</p>${j.match_percentage > 0 ? `<p><span class="match-badge">${j.match_percentage}% Match</span> <span class="muted">on ${(j.matched_skills || []).map((s) => `✓ ${s}`).join(' · ')}</span></p>` : ''}<p>${j.description}</p><p><b>Required skills:</b> ${skillList(j.skills).join(', ') || '-'}</p><button class="btn btn-primary" id="modalApply">Apply for this job</button>`;
    $('jobModal').classList.remove('hidden');
    $('modalApply').addEventListener('click', () => {
      openApplyModal(j.id);
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
  const appBadgeClass = appCount > 0 ? 'good' : 'warn';
  const postedDate = j.created_at ? new Date(j.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

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
    const resumeLabel = a.resume_type === 'custom' ? 'Custom Uploaded Resume' : 'HireFlow Profile Resume';
    const skills = skillList(a.candidate?.skills);
    return `
      <div class="card">
        <div class="card-top">
          <div>
            <b>${a.candidate?.name || 'Applicant'}</b>
            <span class="muted font-xs"> (${a.candidate?.email || ''})</span>
          </div>
          <span class="pill ${STATUS_CLASS[a.status] || ''}">${a.status}</span>
        </div>
        <div class="muted mt-2">Applied for <b>${a.job?.title}</b> • ${new Date(a.applied_at).toLocaleString()}</div>
        ${a.note ? `<div class="mt-2 font-xs muted"><b>Note:</b> ${a.note}</div>` : ''}
        ${skills.length ? `<div class="card-skills mt-2">${skills.slice(0, 6).map((s) => `<span class="skill-tag">${s}</span>`).join('')}</div>` : ''}
        <div class="card-footer mt-3">
          <div>
            ${a.resume_url
              ? `<a href="${a.resume_url}" target="_blank" class="btn btn-sm">📄 ${resumeLabel}</a>`
              : '<span class="muted font-xs">No resume document attached</span>'}
          </div>
          <div class="job-actions">
            <select data-status="${a.id}">
              ${['Applied', 'Under Review', 'Shortlisted', 'Rejected'].map((s) => `<option ${s === a.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>`;
  }).join('')
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
wirePasswordToggles();
setupVoiceSearch('jobMicBtn', 'jobKeyword', () => { page = 1; loadJobs(); });
setupVoiceSearch('dashMicBtn', 'dashSearchKeyword', () => { renderCandidateDashboardJobs(); });
renderNav();
route();
