const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BASE_URL = IS_LOCAL ? 'http://127.0.0.1:5000' : 'https://devfinder-backend-ll4g.onrender.com';
const API = `${BASE_URL}/api`;
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user) window.location.href = '../Authentication/login.html';

let profileData = null;

document.addEventListener('DOMContentLoaded', async () => {
  console.log("Profile Initializing...");
  try {
    await loadProfile();
    await fetchHostedTeams();
    setupListeners();
    console.log("Profile Ready ✅");
  } catch (err) {
    console.error("Profile Init Error:", err);
    showAlert("COULD NOT LOAD PROFILE");
  }
});

// ── DATA LOADING ──

async function loadProfile() {
  const res = await fetch(`${API}/users/me`, { headers: { 'Authorization': `Bearer ${token}` } });
  profileData = await res.json();

  // Sidebar sync
  document.getElementById('sidebar-u-name').textContent = profileData.name.toUpperCase();
  if (profileData.is_admin) {
    document.getElementById('sidebar-u-role').textContent = 'ADMINISTRATOR';
    document.getElementById('sidebar-avatar-circle').style.background = 'var(--red)';
    document.getElementById('sidebar-avatar-circle').style.color = 'white';
  }

  // Avatar island
  const initial = profileData.name.charAt(0).toUpperCase();
  document.getElementById('p-avatar-big').textContent = initial;
  document.getElementById('p-full-name').textContent = profileData.name.toUpperCase();
  document.getElementById('p-email').textContent = profileData.email;
  document.getElementById('p-since').textContent = `MEMBER SINCE ${new Date(profileData.created_at).getFullYear()}`;
  document.getElementById('stat-year').textContent = new Date(profileData.created_at).getFullYear();

  // Links view
  const github = profileData.github_url || '';
  const linkedin = profileData.linkedin_url || '';

  const vGithub = document.getElementById('v-github');
  vGithub.textContent = github || 'Not added';
  vGithub.className = 'link-text' + (github ? ' filled' : '');

  const vLinkedin = document.getElementById('v-linkedin');
  vLinkedin.textContent = linkedin || 'Not added';
  vLinkedin.className = 'link-text' + (linkedin ? ' filled' : '');

  // Social button hrefs
  document.getElementById('p-github-link').href = github || '#';
  document.getElementById('p-linkedin-link').href = linkedin || '#';
  if (!github) document.getElementById('p-github-link').style.opacity = '0.4';
  if (!linkedin) document.getElementById('p-linkedin-link').style.opacity = '0.4';

  // About
  document.getElementById('v-bio').textContent = profileData.bio || 'No bio added yet. Tell the world who you are!';

  // Skills count stat
  document.getElementById('stat-skills').textContent = (profileData.skills || []).length;

  renderViewSkills(profileData.skills || []);
}

function renderViewSkills(skills) {
  const wrap = document.getElementById('v-skills');
  if (!skills.length) {
    wrap.innerHTML = '<span style="font-family:var(--font-ui); font-size:13px; color:var(--text-3); font-weight:500;">No skills listed yet</span>';
    return;
  }
  wrap.innerHTML = skills.map(s => `<span class="skill-chip">${s.toUpperCase()}</span>`).join('');
}

function renderEditSkills(skills) {
  const wrap = document.getElementById('e-skills');
  wrap.innerHTML = skills.map(s => `
    <span class="skill-chip" style="background:var(--yellow-bg); color:var(--yellow-dark); border-color:rgba(146,64,14,0.2);">
      ${s.toUpperCase()}
      <button onclick="removeSkill('${s}')" title="Remove"><i class="fa-solid fa-xmark"></i></button>
    </span>`).join('');
}

// ── LISTENERS ──

function setupListeners() {
  document.getElementById('back-btn').addEventListener('click', () => window.location.href = 'dashboard.html');
  document.getElementById('logout-btn').addEventListener('click', logout);

  document.getElementById('edit-trigger-btn').addEventListener('click', enterEditMode);
  document.getElementById('edit-badge').addEventListener('click', enterEditMode);
  document.getElementById('cancel-edit-btn').addEventListener('click', exitEditMode);
  document.getElementById('save-profile-btn').addEventListener('click', saveProfile);

  document.getElementById('add-skill-btn').addEventListener('click', addSkill);
  document.getElementById('skill-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') addSkill();
  });

  document.getElementById('avatar-input').addEventListener('change', uploadAvatar);

  document.getElementById('close-applicants-btn').addEventListener('click', () => {
    document.getElementById('modal-applicants').classList.remove('active');
  });
}

// ── EDIT MODE ──

function enterEditMode() {
  document.getElementById('view-mode').style.display = 'none';
  document.getElementById('edit-mode').style.display = 'block';
  document.getElementById('edit-badge').style.display = 'none';
  document.getElementById('edit-trigger-btn').style.display = 'none';

  // Populate fields
  document.getElementById('e-name').value = profileData.name || '';
  document.getElementById('e-bio').value = profileData.bio || '';
  document.getElementById('e-github').value = profileData.github_url || '';
  document.getElementById('e-linkedin').value = profileData.linkedin_url || '';
  renderEditSkills(profileData.skills || []);
}

function exitEditMode() {
  document.getElementById('view-mode').style.display = 'block';
  document.getElementById('edit-mode').style.display = 'none';
  document.getElementById('edit-badge').style.display = 'flex';
  document.getElementById('edit-trigger-btn').style.display = 'flex';
}

async function saveProfile() {
  const btn = document.getElementById('save-profile-btn');
  btn.textContent = 'SAVING...';
  btn.disabled = true;

  const updated = {
    name: document.getElementById('e-name').value.trim(),
    bio: document.getElementById('e-bio').value.trim(),
    github_url: document.getElementById('e-github').value.trim(),
    linkedin_url: document.getElementById('e-linkedin').value.trim(),
    skills: profileData.skills || []
  };

  try {
    const res = await fetch(`${API}/users/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(updated)
    });

    if (res.ok) {
      showAlert("PROFILE UPDATED! ✅");
      await loadProfile();
      exitEditMode();
    } else {
      showAlert("SAVE FAILED — TRY AGAIN");
    }
  } catch (err) {
    showAlert("NETWORK ERROR");
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-check"></i> SAVE CHANGES';
    btn.disabled = false;
  }
}

// ── SKILLS ──

function addSkill() {
  const input = document.getElementById('skill-input');
  const val = input.value.trim();
  if (!val) return;

  if (!profileData.skills) profileData.skills = [];
  if (!profileData.skills.map(s => s.toLowerCase()).includes(val.toLowerCase())) {
    profileData.skills.push(val);
    renderEditSkills(profileData.skills);
    document.getElementById('stat-skills').textContent = profileData.skills.length;
  }
  input.value = '';
  input.focus();
}

function removeSkill(skill) {
  profileData.skills = profileData.skills.filter(s => s !== skill);
  renderEditSkills(profileData.skills);
  document.getElementById('stat-skills').textContent = profileData.skills.length;
}

// ── HOSTED TEAMS ──

async function fetchHostedTeams() {
  try {
    const res = await fetch(`${API}/teams`);
    const allTeams = await res.json();
    const hosted = allTeams.filter(t => t.created_by === user.id);

    // Update stat
    document.getElementById('stat-teams').textContent = hosted.length;

    const list = document.getElementById('hosted-list');
    if (!hosted.length) {
      list.innerHTML = `
        <div style="text-align:center; padding:40px 20px; background:var(--surface2); border-radius:var(--radius-lg); border:1.5px dashed var(--border-med);">
          <div style="font-size:32px; margin-bottom:10px;">🚀</div>
          <p style="font-family:var(--font-ui); font-weight:700; color:var(--text-3); font-size:13px;">No teams hosted yet.<br>Head to the dashboard to create one!</p>
        </div>`;
      return;
    }

    list.innerHTML = hosted.map(t => `
      <div class="hosted-team-card">
        <div style="flex:1; min-width:0;">
          <div class="hosted-team-name">${t.name}</div>
          <div class="hosted-team-meta">${(t.tech_stack || []).join(' · ') || 'No stack listed'}</div>
          ${(t.roles || []).length ? `
            <div class="hosted-team-roles">
              ${t.roles.slice(0, 4).map(r => `<span class="hosted-role-chip">${r}</span>`).join('')}
              ${t.roles.length > 4 ? `<span class="hosted-role-chip">+${t.roles.length - 4}</span>` : ''}
            </div>` : ''}
        </div>
        <button class="btn-host" style="font-size:12px; background:var(--yellow); color:var(--text); flex-shrink:0; padding:8px 16px;"
          onclick="openApplicants(${t.id}, '${t.name.replace(/'/g, "\\'")}')">
          <i class="fa-solid fa-users"></i> APPLICANTS
        </button>
      </div>
    `).join('');
  } catch (err) {
    console.error("Hosted teams failed:", err);
    document.getElementById('hosted-list').innerHTML = '<p style="color:var(--red); font-family:var(--font-ui); font-size:13px;">Failed to load teams.</p>';
  }
}

// ── APPLICANTS MODAL ──

async function openApplicants(tid, name) {
  document.getElementById('m-team-name').textContent = name.toUpperCase();
  document.getElementById('modal-applicants').classList.add('active');
  const list = document.getElementById('applicant-list');
  list.innerHTML = '<p style="text-align:center; padding:20px; font-weight:800; font-family:var(--font-ui); opacity:0.5;">LOADING...</p>';

  try {
    const res = await fetch(`${API}/applications/team/${tid}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const apps = await res.json();

    if (!apps.length) {
      list.innerHTML = `
        <div style="text-align:center; padding:40px; background:var(--surface2); border-radius:var(--radius-lg);">
          <p style="font-family:var(--font-ui); font-weight:700; color:var(--text-3);">No applicants yet.</p>
        </div>`;
      return;
    }

    list.innerHTML = apps.map(a => `
      <div style="background:var(--surface2); border:1.5px solid var(--border-med); border-radius:var(--radius-lg); padding:20px; display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div>
            <h3 style="font-family:var(--font-title); font-size:26px; line-height:1;">${a.applicant_name || a.user_name}</h3>
            <p style="font-family:var(--font-ui); font-size:11px; font-weight:600; color:var(--text-3); margin-top:3px;">
              STATUS: <span style="color:${a.status === 'pending' ? 'var(--yellow-dark)' : a.status === 'accepted' ? 'var(--green-dark)' : 'var(--red)'}; font-weight:800;">${a.status.toUpperCase()}</span>
            </p>
          </div>
          <span style="background:var(--purple-bg); color:var(--purple-dark); border:1px solid rgba(91,33,182,0.2); border-radius:99px; padding:5px 14px; font-family:var(--font-ui); font-size:11px; font-weight:700; white-space:nowrap;">${a.role.toUpperCase()}</span>
        </div>
        ${a.message ? `
          <div style="background:white; border:1px solid var(--border); border-radius:var(--radius-sm); padding:14px; font-family:var(--font-ui); font-size:13px; font-weight:500; color:var(--text-2); line-height:1.6;">
            "${a.message}"
          </div>` : ''}
        ${a.status === 'pending' ? `
          <div style="display:flex; gap:8px;">
            <button class="btn-host" style="flex:1; background:var(--green); color:var(--green-dark); font-size:12px;" onclick="handleApp(${a.id}, 'accepted', ${tid})">
              <i class="fa-solid fa-check"></i> ACCEPT
            </button>
            <button class="btn-host" style="flex:1; background:#FEF2F2; color:#DC2626; font-size:12px; border:1px solid #FCA5A5;" onclick="handleApp(${a.id}, 'rejected', ${tid})">
              <i class="fa-solid fa-xmark"></i> REJECT
            </button>
          </div>` : ''}
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = '<p style="color:var(--red); font-family:var(--font-ui); font-size:13px; text-align:center; padding:20px;">Failed to load applicants.</p>';
  }
}

async function handleApp(aid, status, tid) {
  try {
    await fetch(`${API}/applications/${aid}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
    showAlert(`APPLICATION ${status.toUpperCase()}! ✅`);
    openApplicants(tid, document.getElementById('m-team-name').textContent);
  } catch (err) {
    showAlert("ACTION FAILED");
  }
}

// ── AVATAR UPLOAD ──

async function uploadAvatar() {
  showAlert("AVATAR UPLOAD COMING SOON ⚡");
}

// ── UTILS ──

function showAlert(text) {
  const container = document.getElementById('alerts');
  const div = document.createElement('div');
  div.style.cssText = 'background:white; border:1.5px solid var(--border-med); padding:14px 20px; border-radius:14px; box-shadow:var(--shadow-lg); margin-bottom:10px; font-weight:700; font-family:var(--font-ui); font-size:13px; animation:toastIn 0.22s ease;';
  div.textContent = text;
  container.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

function logout() {
  localStorage.clear();
  window.location.href = '../Landing/index.html';
}