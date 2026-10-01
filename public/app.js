const api = (path, opts = {}) => {
  const token = localStorage.getItem('token');
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
  setTimeout(() => t.classList.add('hidden'), 3000);
};

let page = 1; const limit = 9; let cache = [];

// view switching
document.querySelectorAll('.nav-btn').forEach((b) =>
  b.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    showView(b.dataset.view);
  })
);
function showView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  $({ jobs: 'view-jobs', applications: 'view-applications', profile: 'view-profile', auth: 'view-auth' }[name]).classList.add('active');
  if (name === 'applications') loadApplications();
  if (name === 'profile') loadProfile();
}
$('loginNavBtn').addEventListener('click', () => showView('auth'));

// joint login / signup tabs
function showAuthTab(which) {
  const isLogin = which === 'login';
  $('loginForm').classList.toggle('hidden', !isLogin);
  $('registerForm').classList.toggle('hidden', isLogin);
  $('tabLogin').classList.toggle('active', isLogin);
  $('tabRegister').classList.toggle('active', !isLogin);
}
$('tabLogin').addEventListener('click', () => showAuthTab('login'));
$('tabRegister').addEventListener('click', () => showAuthTab('register'));
$('gotoRegister').addEventListener('click', (e) => { e.preventDefault(); showAuthTab('register'); });
$('gotoLogin').addEventListener('click', (e) => { e.preventDefault(); showAuthTab('login'); });

// auth state
function refreshAuth() {
  const token = localStorage.getItem('token');
  const email = localStorage.getItem('email');
  $('logoutBtn').classList.toggle('hidden', !token);
  $('loginNavBtn').classList.toggle('hidden', !!token);
  $('userBadge').classList.toggle('hidden', !token);
  if (token) $('userBadge').textContent = email || 'Logged in';
}
$('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token'); localStorage.removeItem('email');
  refreshAuth(); toast('Logged out'); $('matchBanner').classList.add('hidden'); showView('jobs');
});

$('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: $('regName').value, email: $('regEmail').value, password: $('regPassword').value }) });
    toast('Account created! Now login.');
    $('loginEmail').value = $('regEmail').value;
    e.target.reset();
    showAuthTab('login');
  } catch (err) { toast(err.message); }
});
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: $('loginEmail').value, password: $('loginPassword').value }) });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('email', res.data.user.email);
    refreshAuth(); toast('Login successful'); showView('jobs'); loadMatched();
  } catch (err) { toast(err.message); }
});

// jobs
async function loadJobs() {
  try {
    const q = $('jobSearch').value.trim().toLowerCase();
    const res = await fetch(`/api/jobs?page=${page}&limit=${limit}`).then((r) => r.json());
    let rows = res.data || [];
    cache = rows;
    if (q) rows = rows.filter((j) => `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q));
    $('jobsGrid').innerHTML = rows.length ? rows.map(jobCard).join('') : '<p class="muted">No jobs found. Run <code>npm run seed</code> on the server.</p>';
    $('pageInfo').textContent = `Page ${res.pagination?.page || page} of ${res.pagination?.totalPages || 1} (${res.pagination?.total || rows.length} jobs)`;
    wireJobButtons();
  } catch (err) { toast(err.message); }
}
function jobCard(j) {
  const badge = (j.match_percent != null && j.match_percent > 0) ? ` <span class="match-badge">${j.match_percent}% match</span>` : '';
  const skills = (j.matched_skills && j.matched_skills.length) ? `<div class="muted">Matched: ${j.matched_skills.join(', ')}</div>` : `<div class="muted">${(j.skills || '').slice(0, 80)}</div>`;
  return `<div class="job-card"><span class="pill">${j.employment_type || ''} • ${j.location || ''}</span><h3>${j.title}${badge}</h3><div class="muted">${j.company}</div>${skills}<div class="job-actions"><button class="btn btn-ghost" data-details="${j.id}">Details</button><button class="btn btn-primary" data-apply="${j.id}">Apply</button></div></div>`;
}
// Skill-based recommendations from the uploaded resume.
async function loadMatched() {
  const banner = $('matchBanner');
  if (!localStorage.getItem('token')) { banner.classList.add('hidden'); return; }
  try {
    const res = await api('/api/jobs/matched');
    const top = (res.data.jobs || []).filter((j) => j.match_score > 0).slice(0, 3);
    if (!top.length) { banner.classList.add('hidden'); return; }
    $('matchSkills').textContent = `— based on: ${(res.data.resume_skills || []).join(', ')}`;
    $('matchedGrid').innerHTML = top.map(jobCard).join('');
    banner.classList.remove('hidden');
    // wire buttons inside recommendations too
    cache = [...top, ...cache.filter((c) => !top.some((t) => t.id === c.id))];
    wireJobButtons();
  } catch { banner.classList.add('hidden'); }
}
function wireJobButtons() {
  document.querySelectorAll('[data-apply]').forEach((b) => b.addEventListener('click', async () => {
    if (!localStorage.getItem('token')) { showView('auth'); return toast('Login to apply'); }
    try { await api('/api/applications', { method: 'POST', body: JSON.stringify({ job_id: b.dataset.apply }) }); toast('Application submitted!'); }
    catch (err) { toast(err.message); }
  }));
  document.querySelectorAll('[data-details]').forEach((b) => b.addEventListener('click', () => {
    const j = cache.find((x) => x.id === b.dataset.details);
    if (!j) return;
    $('modalBody').innerHTML = `<span class="pill">${j.employment_type} • ${j.location}</span><h2>${j.title}</h2><p class="muted">${j.company}</p>${j.match_percent > 0 ? `<p><span class="match-badge">${j.match_percent}% match</span> <span class="muted">on ${(j.matched_skills || []).join(', ')}</span></p>` : ''}<p>${j.description}</p><p><b>Skills:</b> ${j.skills || '-'}</p><button class="btn btn-primary" id="modalApply">Apply for this job</button>`;
    $('jobModal').classList.remove('hidden');
    $('modalApply').addEventListener('click', async () => {
      if (!localStorage.getItem('token')) { $('jobModal').classList.add('hidden'); showView('auth'); return toast('Login to apply'); }
      try { await api('/api/applications', { method: 'POST', body: JSON.stringify({ job_id: j.id }) }); toast('Application submitted!'); $('jobModal').classList.add('hidden'); }
      catch (err) { toast(err.message); }
    });
  }));
}
$('modalClose').addEventListener('click', () => $('jobModal').classList.add('hidden'));
$('refreshJobs').addEventListener('click', loadJobs);
$('jobSearch').addEventListener('input', loadJobs);
$('prevPage').addEventListener('click', () => { if (page > 1) { page--; loadJobs(); } });
$('nextPage').addEventListener('click', () => { page++; loadJobs(); });
$('seedHintBtn').addEventListener('click', () => toast('On server: npm run seed, then Refresh'));

$('jobForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/jobs', { method: 'POST', body: JSON.stringify({ title: $('jobTitle').value, company: $('jobCompany').value, location: $('jobLocation').value, employment_type: $('jobType').value, description: $('jobDesc').value, skills: $('jobSkills').value }) });
    toast('Job posted'); e.target.reset(); page = 1; loadJobs();
  } catch (err) { toast(err.message); }
});

// applications
async function loadApplications() {
  if (!localStorage.getItem('token')) { $('appsList').innerHTML = '<p class="muted">Login to view applications.</p>'; return; }
  try {
    const res = await api('/api/applications');
    $('appsList').innerHTML = res.data.length ? res.data.map((a) => `<div class="card"><b>${a.Job?.title}</b> <span class="muted">@ ${a.Job?.company}</span><br/><span class="pill">${a.status}</span> <span class="muted">applied ${new Date(a.applied_at).toLocaleString()}</span></div>`).join('') : '<p class="muted">No applications yet. Apply from Jobs tab.</p>';
  } catch (err) { toast(err.message); }
}

// profile + resume
async function loadProfile() {
  if (!localStorage.getItem('token')) { $('profileBox').textContent = 'Login to view profile.'; return; }
  try {
    const res = await api('/api/users/me');
    const tags = (res.data.resume_skills || []).map((s) => `<span class="skill-tag">${s}</span>`).join('') || '<span class="muted">No skills detected yet — upload a text-based resume.</span>';
    $('profileBox').innerHTML = `<p><b>${res.data.name}</b><br/>${res.data.email}<br/><span class="muted">${res.data.resume_url ? `Resume: <a href="${res.data.resume_url}" target="_blank">view</a>` : 'No resume uploaded'}</span></p><div><b>Detected skills</b><br/>${tags}</div>`;
    $('resumeLink').innerHTML = res.data.resume_url ? `<p><a href="${res.data.resume_url}" target="_blank">View current resume</a></p>` : '';
  } catch (err) { toast(err.message); }
}
$('resumeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = $('resumeFile').files[0];
  if (!file) return toast('Choose a file first');
  if (!localStorage.getItem('token')) { showView('auth'); return toast('Login first'); }
  const fd = new FormData(); fd.append('resume', file);
  try {
    const res = await api('/api/users/resume', { method: 'POST', body: fd });
    const n = (res.data.resume_skills || []).length;
    toast(n ? `Resume uploaded! Detected: ${res.data.resume_skills.join(', ')}` : 'Resume uploaded! No known skills detected.');
    $('resumeLink').innerHTML = `<p><a href="${res.data.resume_url}" target="_blank">View uploaded resume</a></p>`;
    loadProfile();
    loadMatched();
    showView('jobs');
  } catch (err) { toast(err.message); }
});

refreshAuth();
loadJobs();
loadMatched();
