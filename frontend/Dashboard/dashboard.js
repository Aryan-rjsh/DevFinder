const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BASE_URL = IS_LOCAL ? 'http://127.0.0.1:5000' : 'https://devfinder-backend-ll4g.onrender.com';
const API = `${BASE_URL}/api`;
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');
const socket = io(BASE_URL);

// ── GLOBAL STATE ──
const State = {
  isAdmin: false,
  allTeams: [],
  currentTid: null,
  activeNav: 'all',
  manageTid: null,
  manageTname: null,
  hackathons: []
};

// ── BOOTSTRAP ──
if (!token || !user) {
  window.location.href = '../Authentication/login.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log("DevFinder Dashboard Initializing...");
  try {
    document.getElementById('u-name').textContent = user.name.toUpperCase();
    await checkAdmin();
    await fetchTeams();
    await fetchHackathons();
    await fetchNotifications();
    setupEventListeners();
    setupSocketListeners();
    console.log("Dashboard Ready ✅");
  } catch (err) {
    console.error("Critical Init Error:", err);
    showAlert("SYSTEM ERROR: PLEASE REFRESH");
  }
});

// ── CORE LOGIC ──

async function checkAdmin() {
  try {
    const res = await fetch(`${API}/users/me`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok && data.is_admin) {
      State.isAdmin = true;
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
      document.getElementById('u-role').textContent = 'ADMINISTRATOR';
      document.getElementById('u-avatar').style.background = 'var(--red)';
      document.getElementById('u-avatar').style.color = 'white';
    }
  } catch (err) { console.warn("Admin status could not be verified"); }
}

async function fetchTeams() {
  try {
    const search = document.getElementById('search-bar').value;
    const res = await fetch(`${API}/teams`);
    State.allTeams = await res.json();
    const filtered = State.allTeams.filter(t =>
      t.name.toLowerCase().includes(search.toLowerCase())
    );
    renderCards(filtered);
  } catch (err) {
    console.error("Fetch Teams failed:", err);
    showAlert("FAILED TO LOAD TEAMS");
  }
}

function renderCards(teams) {
  const grid = document.getElementById('grid');
  if (!teams.length) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:100px; opacity:0.2"><h1>VOID</h1></div>`;
    return;
  }
  grid.innerHTML = teams.map(t => `
    <article class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${t.name}</h3>
          <p class="card-subtitle">BY ${t.creator_name || 'MEMBER'} ${t.is_verified ? '✅' : ''}</p>
        </div>
        <div style="font-size:24px; color:${t.is_featured ? 'var(--pink)' : 'var(--black)'}">
          <i class="fa-solid ${t.is_featured ? 'fa-star' : 'fa-bolt'}"></i>
        </div>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:10px;">
        ${(t.tech_stack || []).map(s => `<span class="stack-tag" style="margin:0;"><i class="fa-solid fa-code"></i> ${s.toUpperCase()}</span>`).join('')}
      </div>
      <div class="roles-wrap">
        ${(t.roles || []).map(r => `<span class="role-chip">${r.toUpperCase()}</span>`).join('')}
      </div>
      <div style="font-size:10px; opacity:0.6; margin-bottom:15px; display:flex; flex-direction:column; gap:4px; font-weight:800; text-transform:uppercase;">
        ${t.hackathon_name ? `<div><i class="fa-solid fa-trophy" style="margin-right:5px; width:12px;"></i> ${t.hackathon_name}</div>` : ''}
        ${t.deadline ? `<div><i class="fa-regular fa-clock" style="margin-right:5px; width:12px;"></i> BY ${new Date(t.deadline).toLocaleDateString()}</div>` : ''}
      </div>
      <div class="card-footer">
        <div class="team-size">${t.team_size || 4}</div>
        ${t.created_by === user.id
      ? `<button class="btn-apply" style="background:var(--surface2); color:var(--text-3); cursor:default; pointer-events:none; border:1.5px dashed var(--border-med);">YOUR TEAM</button>`
      : `<button class="btn-apply" data-apply-id="${t.id}" data-apply-name="${t.name}" data-apply-roles='${JSON.stringify(t.roles)}'>APPLY</button>`
    }
      </div>
      ${State.isAdmin ? `
        <div style="margin-top:15px; display:flex; gap:10px;">
          <button class="admin-del-btn" data-id="${t.id}" style="flex:1; background:var(--black); color:white; border:none; border-radius:10px; padding:8px; font-weight:900; cursor:pointer;">DEL</button>
          <button class="admin-feat-btn" data-id="${t.id}" data-feat="${!t.is_featured}" style="flex:1; background:${t.is_featured ? 'var(--surface2)' : 'var(--yellow)'}; border:2px solid black; border-radius:10px; padding:8px; font-weight:900; cursor:pointer;">${t.is_featured ? 'UNFEAT' : 'FEAT'}</button>
        </div>` : ''}
    </article>`).join('');
}

// ── EVENT LISTENERS ──

function setupEventListeners() {
  document.querySelectorAll('.nav-item[data-nav]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      handleNav(item.dataset.nav);
    });
  });

  document.getElementById('search-bar').addEventListener('input', fetchTeams);

  document.getElementById('host-trigger').addEventListener('click', () => {
    resetHostModal();
    openModal('modal-host');
  });

  document.getElementById('notif-trigger').addEventListener('click', () => toggleNotifs());
  document.getElementById('logout-btn').addEventListener('click', logout);

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#hackathon-combobox')) {
      closeCombobox();
    }
  });

  document.getElementById('add-role-btn').addEventListener('click', () => addRoleField());

  document.getElementById('publish-team-btn').addEventListener('click', submitTeam);
  document.getElementById('submit-application-btn').addEventListener('click', submitApply);
  document.getElementById('send-chat-btn').addEventListener('click', sendMessage);
  document.getElementById('broadcast-btn').addEventListener('click', sendBroadcast);
  document.getElementById('save-hack-btn').addEventListener('click', saveHackathon);
  document.getElementById('admin-nav-btn').addEventListener('click', openAdminPanel);

  document.getElementById('grid').addEventListener('click', e => {
    const hackEditBtn = e.target.closest('.hack-edit-btn');
    if (hackEditBtn) {
      const { id, name, loc, url } = hackEditBtn.dataset;
      document.getElementById('e-hack-id').value = id;
      document.getElementById('e-hack-name').value = name;
      document.getElementById('e-hack-loc').value = loc;
      document.getElementById('e-hack-url').value = url;
      openModal('modal-edit-hack');
      return;
    }
    const hackDelBtn = e.target.closest('.hack-del-btn');
    if (hackDelBtn) { deleteHackathon(hackDelBtn.dataset.id); return; }

    const manageBtn = e.target.closest('.btn-manage');
    if (manageBtn) { openManageModal(manageBtn.dataset.tid, manageBtn.dataset.tname); return; }

    const applyBtn = e.target.closest('[data-apply-id]');
    if (applyBtn) {
      const { applyId, applyName, applyRoles } = applyBtn.dataset;
      openApplyModal(applyId, applyName, JSON.parse(applyRoles));
      return;
    }
    const delBtn = e.target.closest('.admin-del-btn');
    if (delBtn) { deleteTeam(delBtn.dataset.id); return; }

    const featBtn = e.target.closest('.admin-feat-btn');
    if (featBtn) { toggleFeature(featBtn.dataset.id, featBtn.dataset.feat === 'true'); return; }

    const chatBtn = e.target.closest('.open-chat-btn');
    if (chatBtn) {
      const { tid, tname } = chatBtn.dataset;
      if (tid && tname) openChat(tid, tname);
      return;
    }
  });

  document.getElementById('chat-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') sendMessage();
  });
}

// ── COMBOBOX (hackathon) ──

function initCombobox() {
  const input = document.getElementById('h-hack-input');
  const dropdown = document.getElementById('h-hack-dropdown');
  const hiddenId = document.getElementById('h-hack-id');

  input.value = '';
  hiddenId.value = '';
  dropdown.innerHTML = '';
  dropdown.classList.remove('open');

  input.addEventListener('input', () => {
    hiddenId.value = '';
    filterCombobox(input.value);
  });

  input.addEventListener('focus', () => {
    filterCombobox(input.value);
  });
}

function filterCombobox(query) {
  const dropdown = document.getElementById('h-hack-dropdown');
  const matches = State.hackathons.filter(h =>
    h.name.toLowerCase().includes(query.toLowerCase())
  );

  if (matches.length === 0 && query.trim() === '') {
    dropdown.classList.remove('open');
    return;
  }

  dropdown.innerHTML = matches.map(h => `
    <div class="combobox-option" data-id="${h.id}" data-name="${h.name}">
      <i class="fa-solid fa-trophy" style="opacity:0.4; margin-right:8px;"></i>${h.name}
    </div>
  `).join('');

  if (query.trim() && !matches.find(h => h.name.toLowerCase() === query.toLowerCase())) {
    dropdown.innerHTML += `
      <div class="combobox-option combobox-new" data-id="" data-name="${query.trim()}">
        <i class="fa-solid fa-plus" style="opacity:0.6; margin-right:8px;"></i>Create "${query.trim()}"
      </div>
    `;
  }

  dropdown.classList.toggle('open', dropdown.innerHTML !== '');

  dropdown.querySelectorAll('.combobox-option').forEach(opt => {
    opt.addEventListener('mousedown', e => {
      e.preventDefault();
      document.getElementById('h-hack-input').value = opt.dataset.name;
      document.getElementById('h-hack-id').value = opt.dataset.id;
      dropdown.classList.remove('open');
    });
  });
}

function closeCombobox() {
  const dropdown = document.getElementById('h-hack-dropdown');
  if (dropdown) dropdown.classList.remove('open');
}

// ── ROLE INPUTS ──

function addRoleField(prefill = '') {
  const div = document.createElement('div');
  div.style.cssText = 'display:flex; gap:8px; margin-bottom:8px;';
  div.innerHTML = `
    <input type="text" value="${prefill}" placeholder="e.g. Frontend Dev"
      style="flex:1; padding:12px 16px; border:1.5px solid var(--border-med); border-radius:12px;
             font-family:var(--font-ui); font-size:14px; font-weight:500; background:var(--surface2);
             color:var(--text); outline:none; transition:all 0.18s;">
    <button type="button"
      style="width:45px; height:45px; border-radius:50%; background:var(--red); color:white;
             border:none; cursor:pointer; font-size:16px; flex-shrink:0; display:flex;
             align-items:center; justify-content:center;"
      onclick="this.parentElement.remove()">
      <i class="fa-solid fa-minus"></i>
    </button>`;
  document.getElementById('role-inputs').appendChild(div);
  div.querySelector('input').focus();
}

function resetHostModal() {
  document.getElementById('h-name').value = '';
  document.getElementById('h-tech').value = '';
  document.getElementById('h-date').value = '';
  document.getElementById('role-inputs').innerHTML = '';
  addRoleField();
  initCombobox();
}

// ── SUBMIT TEAM ──

async function submitTeam() {
  const name = document.getElementById('h-name').value.trim();
  const roles = [...document.querySelectorAll('#role-inputs input')]
    .map(i => i.value.trim())
    .filter(Boolean);
  const techRaw = document.getElementById('h-tech').value;
  const tech_stack = techRaw
    ? techRaw.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  if (!name) return showAlert("⚠️ TEAM NAME IS REQUIRED");
  if (roles.length === 0) return showAlert("⚠️ ADD AT LEAST ONE ROLE");

  const hackId = document.getElementById('h-hack-id').value.trim();
  const hackName = document.getElementById('h-hack-input').value.trim();
  let hackathon_id = hackId || null;

  try {
    if (!hackathon_id && hackName) {
      const hackRes = await fetch(`${API}/hackathons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: hackName })
      });
      if (hackRes.ok) {
        const hackData = await hackRes.json();
        hackathon_id = hackData.id;
        await fetchHackathons();
      }
    }

    const payload = {
      name,
      tech_stack,
      roles,
      deadline: document.getElementById('h-date').value || null,
      hackathon_id: hackathon_id || null
    };

    console.log("Submitting team payload:", payload);

    const res = await fetch(`${API}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeModal('modal-host');
      fetchTeams();
      showAlert("TEAM PUBLISHED! ✅");
    } else {
      const errData = await res.json().catch(() => ({}));
      console.error("Backend error:", errData);
      showAlert(errData.error || errData.message || "PUBLISH FAILED — CHECK CONSOLE");
    }
  } catch (err) {
    console.error("Submit team error:", err);
    showAlert("SUBMISSION FAILED — NETWORK ERROR");
  }
}

// ── NAV HANDLER ──

async function handleNav(type) {
  State.activeNav = type;
  const grid = document.getElementById('grid');

  if (type === 'all') fetchTeams();
  else if (type === 'recommended') {
    const res = await fetch(`${API}/teams/recommended`, { headers: { 'Authorization': `Bearer ${token}` } });
    renderCards(await res.json());
  }
  else if (type === 'hosted') {
    const hosted = State.allTeams.filter(t => t.created_by === user.id);
    grid.innerHTML = hosted.map(t => `
      <article class="card" style="border-color:var(--pink)">
        <div class="card-header"><div><h3 class="card-title">${t.name}</h3><p class="card-subtitle">HOSTING</p></div></div>
        <div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:10px;">
          ${(t.tech_stack || []).map(s => `<span class="stack-tag" style="margin:0;"><i class="fa-solid fa-code"></i> ${s.toUpperCase()}</span>`).join('')}
        </div>
        <div class="roles-wrap">
          ${(t.roles || []).map(r => `<span class="role-chip">${r.toUpperCase()}</span>`).join('')}
        </div>
        <div style="font-size:10px; opacity:0.6; margin-bottom:15px; display:flex; flex-direction:column; gap:4px; font-weight:800; text-transform:uppercase;">
          ${t.hackathon_name ? `<div><i class="fa-solid fa-trophy" style="margin-right:5px; width:12px;"></i> ${t.hackathon_name}</div>` : ''}
          ${t.deadline ? `<div><i class="fa-regular fa-clock" style="margin-right:5px; width:12px;"></i> BY ${new Date(t.deadline).toLocaleDateString()}</div>` : ''}
        </div>
        <div class="card-footer">
          <button class="btn-apply btn-manage" data-tid="${t.id}" data-tname="${t.name.replace(/'/g, "&apos;")}"
            style="background:var(--black); color:white; width:100%">MANAGE TEAM</button>
        </div>
      </article>`).join('');
  }
  else if (type === 'joined') {
    const res = await fetch(`${API}/teams/my-teams`, { headers: { 'Authorization': `Bearer ${token}` } });
    const teams = await res.json();
    grid.innerHTML = teams.map(t => `
      <article class="card" style="border-color:var(--green)">
        <div class="card-header"><div><h3 class="card-title">${t.name}</h3><p class="card-subtitle">MEMBER</p></div></div>
        <div style="margin:15px 0; background:var(--bg); padding:15px; border-radius:12px; border:2px solid black;">
          ${t.members.map(m => `<div style="display:flex; justify-content:space-between; font-size:12px; font-weight:900; margin-bottom:5px;"><span>${m.name}</span><span style="opacity:0.5">${m.role_in_team}</span></div>`).join('')}
        </div>
        <div class="card-footer">
          <button class="btn-apply open-chat-btn" data-tid="${t.id}" data-tname="${t.name.replace(/'/g, "&apos;")}"
            style="background:var(--yellow); width:100%">
            <i class="fa-solid fa-comments"></i> OPEN CHAT
          </button>
        </div>
      </article>`).join('');
  }
  else if (type === 'hackathons') {
    const res = await fetch(`${API}/hackathons`);
    const data = await res.json();
    grid.innerHTML = data.map(h => `
      <article class="card" style="background:var(--black); color:white">
        <h3 class="card-title" style="color:var(--yellow)">${h.name}</h3>
        <p style="font-size:12px; opacity:0.6; margin-bottom:15px;">${h.location || ''}</p>
        <div style="display:flex; gap:10px;">
          <button class="btn-apply" style="flex:1; background:var(--white); color:var(--black)"
            onclick="window.open('${h.website_url || '#'}', '_blank')">VISIT</button>
          ${State.isAdmin ? `
            <button class="hack-edit-btn"
              data-id="${h.id}"
              data-name="${h.name.replace(/'/g, "&apos;")}"
              data-loc="${(h.location || '').replace(/'/g, "&apos;")}"
              data-url="${(h.website_url || '').replace(/'/g, "&apos;")}"
              style="padding:10px; width:45px; border-radius:99px; background:var(--yellow); border:none; color:black; font-weight:800; cursor:pointer;">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="hack-del-btn" data-id="${h.id}"
              style="padding:10px; width:45px; border-radius:99px; background:var(--red); border:none; color:white; font-weight:800; cursor:pointer;">
              <i class="fa-solid fa-trash"></i>
            </button>
          ` : ''}
        </div>
      </article>`).join('');
  }
}

// ── MODAL HELPERS ──

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function openAdminPanel() {
  openModal('modal-admin');
  fetchAdminStats();
}

function openApplyModal(id, name, roles) {
  State.currentTid = id;
  document.getElementById('apply-title').textContent = name;
  document.getElementById('a-role').innerHTML = roles.map(r => `<option value="${r}">${r}</option>`).join('');
  openModal('modal-apply');
}

// ── APPLY ──

async function submitApply() {
  try {
    await fetch(`${API}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        team_id: State.currentTid,
        role: document.getElementById('a-role').value,
        message: document.getElementById('a-msg').value
      })
    });
    showAlert("APPLICATION SENT! 🚀");
    closeModal('modal-apply');
  } catch (err) { showAlert("APPLICATION FAILED"); }
}

// ── CHAT ──

function openChat(tid, name) {
  State.currentTid = tid;
  const titleEl = document.getElementById('chat-title');
  const msgsEl = document.getElementById('chat-msgs');
  if (titleEl) titleEl.textContent = name.toUpperCase();
  if (msgsEl) msgsEl.innerHTML = '<p style="text-align:center; padding:20px; opacity:0.5; font-weight:900;">SYNCING CHANNEL...</p>';
  openModal('modal-chat');
  socket.emit('join_room', tid);
  fetch(`${API}/chat/${tid}`, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(r => r.json())
    .then(msgs => {
      if (msgsEl) {
        msgsEl.innerHTML = '';
        if (msgs.length === 0) {
          msgsEl.innerHTML = '<p style="text-align:center; padding:40px; opacity:0.2; font-weight:900;">NO MESSAGES YET</p>';
        } else {
          msgs.forEach(m => renderMsg(m));
        }
      }
    })
    .catch(() => {
      if (msgsEl) msgsEl.innerHTML = '<p style="color:var(--red); text-align:center; padding:20px;">FAILED TO LOAD HISTORY</p>';
    });
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  if (!input.value.trim() || !State.currentTid) return;
  socket.emit('send_message', {
    teamId: State.currentTid,
    senderId: user.id,
    senderName: user.name,
    message: input.value
  });
  input.value = '';
}

function renderMsg(m) {
  const container = document.getElementById('chat-msgs');
  const div = document.createElement('div');
  const isMe = (m.sender_id || m.senderId) == user.id;
  div.className = `msg ${isMe ? 'sent' : 'received'}`;
  div.innerHTML = `
    <div style="font-size:9px; font-weight:900; margin-bottom:3px; opacity:0.4;">${isMe ? 'YOU' : (m.sender_name || m.senderName)}</div>
    <div>${m.content || m.message}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ── MANAGE TEAM ──

async function openManageModal(tid, tname) {
  State.manageTid = tid;
  State.manageTname = tname;
  document.getElementById('manage-title').textContent = `MANAGE: ${tname.toUpperCase()}`;
  document.getElementById('manage-pending-list').innerHTML = '<p style="text-align:center; opacity:0.5; padding:20px;">LOADING...</p>';
  document.getElementById('manage-members-list').innerHTML = '<p style="text-align:center; opacity:0.5; padding:20px;">LOADING...</p>';
  openModal('modal-manage');

  try {
    const res = await fetch(`${API}/applications/team/${tid}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error("Failed to fetch applications");
    const apps = await res.json();
    const pending = apps.filter(a => a.status === 'pending');
    const accepted = apps.filter(a => a.status === 'accepted');

    const renderAppCard = (a, isPending) => `
      <div style="background:var(--surface2); border:1.5px solid var(--border-med); border-radius:var(--radius-sm); padding:15px;">
        <div style="font-weight:800; font-family:var(--font-ui); font-size:14px; margin-bottom:5px;">${a.applicant_name}</div>
        <div style="font-size:11px; opacity:0.6; margin-bottom:10px;">ROLE: ${a.role.toUpperCase()}</div>
        ${a.message ? `<div style="font-size:12px; margin-bottom:10px; background:var(--bg); padding:10px; border-radius:var(--radius-xs);">${a.message}</div>` : ''}
        <div style="display:flex; gap:8px;">
          ${isPending ? `
            <button onclick="updateAppStatus(${a.id}, 'accepted')" style="flex:1; padding:8px; background:var(--green); border:none; border-radius:99px; font-weight:800; font-size:11px; cursor:pointer;">ACCEPT</button>
            <button onclick="updateAppStatus(${a.id}, 'rejected')" style="flex:1; padding:8px; background:var(--red); color:white; border:none; border-radius:99px; font-weight:800; font-size:11px; cursor:pointer;">REJECT</button>
          ` : `
            <button onclick="updateAppStatus(${a.id}, 'rejected')" style="width:100%; padding:8px; background:var(--red); color:white; border:none; border-radius:99px; font-weight:800; font-size:11px; cursor:pointer;">KICK MEMBER</button>
          `}
        </div>
      </div>`;

    document.getElementById('manage-pending-list').innerHTML = pending.length
      ? pending.map(a => renderAppCard(a, true)).join('')
      : '<p style="opacity:0.5; font-size:12px; text-align:center; padding:20px;">No pending applications.</p>';
    document.getElementById('manage-members-list').innerHTML = accepted.length
      ? accepted.map(a => renderAppCard(a, false)).join('')
      : '<p style="opacity:0.5; font-size:12px; text-align:center; padding:20px;">No members yet.</p>';
  } catch (err) {
    document.getElementById('manage-pending-list').innerHTML = '<p style="color:var(--red); text-align:center;">Error loading data.</p>';
    document.getElementById('manage-members-list').innerHTML = '';
  }
}

async function updateAppStatus(appId, status) {
  if (status === 'rejected' && !confirm('Are you sure?')) return;
  try {
    const res = await fetch(`${API}/applications/${appId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const data = await res.json();
      showAlert(data.error || "Action failed");
      return;
    }
    showAlert(`Successfully ${status}!`);
    openManageModal(State.manageTid, State.manageTname);
  } catch (err) { showAlert("Network error"); }
}

// ── ADMIN OPS ──

async function fetchAdminStats() {
  const res = await fetch(`${API}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
  const d = await res.json();
  document.getElementById('stat-u').textContent = d.users;
  document.getElementById('stat-t').textContent = d.teams;
  document.getElementById('stat-a').textContent = d.applications;
}

async function sendBroadcast() {
  const msg = document.getElementById('admin-bc').value;
  if (!msg) return;
  await fetch(`${API}/admin/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ message: msg })
  });
  showAlert("BROADCAST SENT! 📢");
  document.getElementById('admin-bc').value = '';
}

async function deleteTeam(id) {
  if (!confirm("ADMIN: PERMANENTLY DELETE TEAM?")) return;
  await fetch(`${API}/teams/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  fetchTeams();
}

async function toggleFeature(id, f) {
  await fetch(`${API}/admin/feature-team/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ is_featured: f })
  });
  fetchTeams();
}

async function deleteHackathon(id) {
  if (!confirm("ADMIN: PERMANENTLY DELETE HACKATHON?")) return;
  try {
    const res = await fetch(`${API}/hackathons/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      showAlert("HACKATHON DELETED 🗑️");
      handleNav('hackathons');
    }
  } catch (err) { showAlert("DELETE FAILED"); }
}

async function saveHackathon() {
  const id = document.getElementById('e-hack-id').value;
  const name = document.getElementById('e-hack-name').value;
  const location = document.getElementById('e-hack-loc').value;
  const website_url = document.getElementById('e-hack-url').value;
  try {
    const res = await fetch(`${API}/hackathons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name, location, website_url })
    });
    if (res.ok) {
      closeModal('modal-edit-hack');
      showAlert("HACKATHON UPDATED ✅");
      handleNav('hackathons');
    }
  } catch (err) { showAlert("UPDATE FAILED"); }
}

// ── UTILS ──

function showAlert(text) {
  const container = document.getElementById('alerts');
  const div = document.createElement('div');
  div.style.cssText = 'background:white; border:2px solid var(--border-med); padding:14px 20px; border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,0.1); margin-bottom:10px; font-weight:700; font-family:var(--font-ui); font-size:13px; animation:toastIn 0.22s ease;';
  div.textContent = text;
  container.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

async function fetchHackathons() {
  try {
    const res = await fetch(`${API}/hackathons`);
    State.hackathons = await res.json();
  } catch (err) {
    console.warn("Could not fetch hackathons");
    State.hackathons = [];
  }
}

async function fetchNotifications() {
  try {
    const res = await fetch(`${API}/notifications`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    const unread = data.filter(n => !n.is_read).length;
    const count = document.getElementById('notif-count');
    if (count) {
      count.style.display = unread > 0 ? 'flex' : 'none';
      count.textContent = unread;
    }
  } catch (err) { console.warn("Notifications fetch failed"); }
}

function setupSocketListeners() {
  socket.on('receive_message', m => {
    if (m.teamId == State.currentTid) renderMsg(m);
  });
  socket.on('notification', () => {
    fetchNotifications();
    showAlert("NEW ALERT! 🔔");
  });
}

function logout() {
  localStorage.clear();
  window.location.href = '../Authentication/login.html';
}

function toggleNotifs() {
  showAlert("NOTIFICATIONS SYNCED 🔔");
  fetchNotifications();
}