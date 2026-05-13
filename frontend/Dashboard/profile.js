const API    = 'http://127.0.0.1:5000/api';
const token  = localStorage.getItem('token');
const user   = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user) window.location.href = '../Authentication/login.html';

let profileData = null;

document.addEventListener('DOMContentLoaded', async () => {
  console.log("Profile Initializing...");
  
  try {
    // Initial Load
    await loadProfile();
    await fetchHostedTeams();
    
    // Listeners
    setupProfileListeners();
    
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
  
  // Sidebar Sync
  document.getElementById('sidebar-u-name').textContent = profileData.name.toUpperCase();
  if (profileData.is_admin) {
    document.getElementById('sidebar-u-role').textContent = 'ADMINISTRATOR';
    document.getElementById('sidebar-avatar-circle').style.background = 'var(--red)';
  }

  // Left Island
  document.getElementById('p-full-name').textContent = profileData.name.toUpperCase();
  document.getElementById('p-email').textContent = profileData.email;
  document.getElementById('p-avatar-big').textContent = profileData.name.charAt(0).toUpperCase();
  
  // Links
  document.getElementById('v-github').textContent = profileData.github_url || 'Not added';
  document.getElementById('v-linkedin').textContent = profileData.linkedin_url || 'Not added';
  document.getElementById('p-github-link').href = profileData.github_url || '#';
  document.getElementById('p-linkedin-link').href = profileData.linkedin_url || '#';
  
  // Right Island
  document.getElementById('v-bio').textContent = profileData.bio || 'No bio added yet.';
  document.getElementById('p-since').textContent = `MEMBER SINCE ${new Date(profileData.created_at).getFullYear()}`;
  
  // Skills
  renderSkills(profileData.skills || []);
}

function renderSkills(skills) {
  const vWrap = document.getElementById('v-skills');
  const eWrap = document.getElementById('e-skills');
  
  vWrap.innerHTML = skills.length ? skills.map(s => `<span class="skill-tag">${s.toUpperCase()}</span>`).join('') : '<p style="opacity:0.5">No skills listed</p>';
  eWrap.innerHTML = skills.map(s => `
    <span class="skill-tag" style="background:var(--yellow)">
      ${s.toUpperCase()}
      <button onclick="removeSkill('${s}')"><i class="fa-solid fa-xmark"></i></button>
    </span>`).join('');
}

// ── LISTENERS ──

function setupProfileListeners() {
  document.getElementById('edit-trigger-btn').addEventListener('click', toggleEdit);
  document.getElementById('cancel-edit-btn').addEventListener('click', toggleEdit);
  document.getElementById('save-profile-btn').addEventListener('click', saveProfile);
  document.getElementById('add-skill-btn').addEventListener('click', addSkill);
  
  document.getElementById('skill-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') addSkill();
  });

  document.getElementById('avatar-input').addEventListener('change', uploadAvatar);
}

// ── EDIT MODE ──

function toggleEdit() {
  const vMode = document.getElementById('view-mode');
  const eMode = document.getElementById('edit-mode');
  const isEditing = eMode.style.display === 'block';

  if (!isEditing) {
    // Populate fields
    document.getElementById('e-name').value = profileData.name;
    document.getElementById('e-bio').value = profileData.bio || '';
    document.getElementById('e-github').value = profileData.github_url || '';
    document.getElementById('e-linkedin').value = profileData.linkedin_url || '';
    
    vMode.style.display = 'none';
    eMode.style.display = 'block';
    document.getElementById('edit-trigger-btn').style.display = 'none';
  } else {
    vMode.style.display = 'block';
    eMode.style.display = 'none';
    document.getElementById('edit-trigger-btn').style.display = 'block';
  }
}

async function saveProfile() {
  const updated = {
    name: document.getElementById('e-name').value,
    bio: document.getElementById('e-bio').value,
    github_url: document.getElementById('e-github').value,
    linkedin_url: document.getElementById('e-linkedin').value,
    skills: profileData.skills
  };

  try {
    const res = await fetch(`${API}/users/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(updated)
    });
    
    if (res.ok) {
      showAlert("PROFILE UPDATED! ✅");
      await loadProfile();
      toggleEdit();
    }
  } catch (err) { showAlert("SAVE FAILED"); }
}

// ── SKILLS ──

function addSkill() {
  const input = document.getElementById('skill-input');
  const val = input.value.trim();
  if (!val) return;
  
  if (!profileData.skills) profileData.skills = [];
  if (!profileData.skills.includes(val)) {
    profileData.skills.push(val);
    renderSkills(profileData.skills);
  }
  input.value = '';
}

function removeSkill(skill) {
  profileData.skills = profileData.skills.filter(s => s !== skill);
  renderSkills(profileData.skills);
}

// ── HOSTED TEAMS ──

async function fetchHostedTeams() {
  try {
    const res = await fetch(`${API}/teams`);
    const allTeams = await res.json();
    const hosted = allTeams.filter(t => t.created_by === user.id);
    
    const list = document.getElementById('hosted-list');
    if (!hosted.length) {
      list.innerHTML = '<p style="text-align:center; padding:40px; opacity:0.3; font-weight:800;">NO TEAMS HOSTED YET</p>';
      return;
    }
    
    list.innerHTML = hosted.map(t => `
      <div class="hosted-team-row">
        <div>
          <h4>${t.name}</h4>
          <p style="font-size:10px; font-weight:900; opacity:0.6;">${t.team_size} MEMBERS NEEDED</p>
        </div>
        <button class="btn-host" style="font-size:14px; background:var(--white); color:black;" onclick="openApplicants(${t.id}, '${t.name.replace(/'/g, "\\'")}')">
          VIEW APPLICANTS
        </button>
      </div>
    `).join('');
  } catch (err) { console.error("Hosted teams failed"); }
}

// ── APPLICANTS ──

async function openApplicants(tid, name) {
  document.getElementById('m-team-name').textContent = name.toUpperCase();
  document.getElementById('modal-applicants').classList.add('active');
  const list = document.getElementById('applicant-list');
  list.innerHTML = '<p style="text-align:center; padding:20px; font-weight:800;">LOADING...</p>';

  try {
    const res = await fetch(`${API}/applications/team/${tid}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const apps = await res.json();
    
    if (!apps.length) {
      list.innerHTML = '<p style="text-align:center; padding:20px; font-weight:800; opacity:0.4;">NO APPLICANTS YET</p>';
      return;
    }

    list.innerHTML = apps.map(a => `
      <div style="background:var(--bg); border:3px solid black; border-radius:15px; padding:20px; display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-family:var(--font-title); font-size:24px;">${a.user_name}</h3>
          <span style="background:var(--yellow); border:2px solid black; border-radius:99px; padding:4px 12px; font-size:10px; font-weight:900;">${a.role.toUpperCase()}</span>
        </div>
        <div style="background:white; border:2px solid black; border-radius:10px; padding:15px; font-size:13px; font-weight:700;">
          "${a.message || 'No message provided.'}"
        </div>
        <div style="display:flex; gap:10px; margin-top:5px;">
          <button class="btn-host" style="flex:1; background:var(--green); font-size:14px; color:black;" onclick="handleApp(${a.id}, 'accepted', ${tid})">ACCEPT</button>
          <button class="btn-host" style="flex:1; background:var(--red); font-size:14px; color:white;" onclick="handleApp(${a.id}, 'rejected', ${tid})">REJECT</button>
        </div>
      </div>
    `).join('');
  } catch (err) { list.innerHTML = 'ERROR LOADING'; }
}

async function handleApp(aid, status, tid) {
  await fetch(`${API}/applications/${aid}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ status })
  });
  showAlert(`APPLICATION ${status.toUpperCase()}!`);
  openApplicants(tid, document.getElementById('m-team-name').textContent);
}

// ── UTILS ──

function showAlert(text) {
  const container = document.getElementById('alerts');
  const div = document.createElement('div');
  div.style.background = 'white'; div.style.border = '4px solid black'; div.style.padding = '15px 25px';
  div.style.borderRadius = '15px'; div.style.boxShadow = '6px 6px 0px black';
  div.style.marginBottom = '10px'; div.style.fontWeight = '900';
  div.textContent = text;
  container.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

async function uploadAvatar(e) {
  showAlert("AVATAR UPLOAD COMING SOON ⚡");
}

function logout() { 
  localStorage.clear(); 
  window.location.href = '../Authentication/login.html'; 
}