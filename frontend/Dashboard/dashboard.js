const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BASE_URL = IS_LOCAL ? 'http://127.0.0.1:5000' : 'https://devfinder-backend-ll4g.onrender.com'; // TODO: Replace with your Render URL
const API      = `${BASE_URL}/api`;
const token  = localStorage.getItem('token');
const user   = JSON.parse(localStorage.getItem('user') || 'null');
const socket = io(BASE_URL);

// ── GLOBAL STATE ──
const State = {
  isAdmin: false,
  allTeams: [],
  currentTid: null,
  activeNav: 'all'
};

// ── BOOTSTRAP ──
if (!token || !user) {
  window.location.href = '../Authentication/login.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log("DevFinder Dashboard Initializing...");
  
  try {
    // 1. Setup UI
    document.getElementById('u-name').textContent = user.name.toUpperCase();
    
    // 2. Initial Data Load
    await checkAdmin();
    await fetchTeams();
    await fetchHackathons();
    await fetchNotifications();
    
    // 3. Setup Listeners
    setupEventListeners();
    
    // 4. Socket Listeners
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
      <div class="roles-wrap">
        ${(t.roles || []).map(r => `<span class="role-chip">${r.toUpperCase()}</span>`).join('')}
      </div>
      <div class="card-footer">
        <div class="team-size">${t.team_size || 4}</div>
        <button class="btn-apply" data-apply-id="${t.id}" data-apply-name="${t.name}" data-apply-roles='${JSON.stringify(t.roles)}'>APPLY</button>
      </div>
      ${State.isAdmin ? `
        <div style="margin-top:15px; display:flex; gap:10px;">
          <button class="admin-del-btn" data-id="${t.id}" style="flex:1; background:var(--black); color:white; border:none; border-radius:10px; padding:8px; font-weight:900; cursor:pointer;">DEL</button>
          <button class="admin-feat-btn" data-id="${t.id}" data-feat="${!t.is_featured}" style="flex:1; background:var(--yellow); border:2px solid black; border-radius:10px; padding:8px; font-weight:900; cursor:pointer;">FEAT</button>
        </div>` : ''}
    </article>`).join('');
}

// ── EVENT LISTENERS ──

function setupEventListeners() {
  // Sidebar Navigation
  document.querySelectorAll('.nav-item[data-nav]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      handleNav(item.dataset.nav);
    });
  });

  // Topbar Actions
  document.getElementById('search-bar').addEventListener('input', fetchTeams);
  document.getElementById('host-trigger').addEventListener('click', () => openModal('modal-host'));
  document.getElementById('notif-trigger').addEventListener('click', () => toggleNotifs());
  document.getElementById('logout-btn').addEventListener('click', logout);
  
  // Modal Closing (Delegation)
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  // Role Field Adder
  document.getElementById('add-role-btn').addEventListener('click', addRoleField);

  // Submit Buttons
  document.getElementById('publish-team-btn').addEventListener('click', submitTeam);
  document.getElementById('submit-application-btn').addEventListener('click', submitApply);
  document.getElementById('send-chat-btn').addEventListener('click', sendMessage);
  document.getElementById('broadcast-btn').addEventListener('click', sendBroadcast);
  
  // Admin Panel Trigger
  document.getElementById('admin-nav-btn').addEventListener('click', openAdminPanel);

  // Global Grid Click Delegation (For dynamic cards)
  document.getElementById('grid').addEventListener('click', e => {
    const applyBtn = e.target.closest('.btn-apply');
    if (applyBtn) {
      const { applyId, applyName, applyRoles } = applyBtn.dataset;
      openApplyModal(applyId, applyName, JSON.parse(applyRoles));
      return;
    }

    const delBtn = e.target.closest('.admin-del-btn');
    if (delBtn) {
      deleteTeam(delBtn.dataset.id);
      return;
    }

    const featBtn = e.target.closest('.admin-feat-btn');
    if (featBtn) {
      toggleFeature(featBtn.dataset.id, featBtn.dataset.feat === 'true');
      return;
    }

    const chatBtn = e.target.closest('.open-chat-btn');
    if (chatBtn) {
      console.log("Chat button clicked!", chatBtn.dataset);
      const { tid, tname } = chatBtn.dataset;
      if (tid && tname) {
        openChat(tid, tname);
      } else {
        console.error("Missing TID or TNAME in dataset");
      }
      return;
    }
  });

  // Enter Key for Chat
  document.getElementById('chat-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') sendMessage();
  });
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
        <div class="roles-wrap">${(t.roles || []).map(r => `<span class="role-chip">${r}</span>`).join('')}</div>
        <div class="card-footer"><button class="btn-apply" style="background:var(--black); color:white; width:100%" onclick="alert('Manage feature coming')">MANAGE TEAM</button></div>
      </article>`).join('');
  }
  else if (type === 'joined') {
    console.log("Fetching Joined Teams...");
    const res = await fetch(`${API}/teams/my-teams`, { headers: { 'Authorization': `Bearer ${token}` } });
    const teams = await res.json();
    grid.innerHTML = teams.map(t => `
      <article class="card" style="border-color:var(--green)">
        <div class="card-header"><div><h3 class="card-title">${t.name}</h3><p class="card-subtitle">MEMBER</p></div></div>
        <div style="margin:15px 0; background:var(--bg); padding:15px; border-radius:12px; border:2px solid black;">
          ${t.members.map(m => `<div style="display:flex; justify-content:space-between; font-size:12px; font-weight:900; margin-bottom:5px;"><span>${m.name}</span><span style="opacity:0.5">${m.role_in_team}</span></div>`).join('')}
        </div>
        <div class="card-footer">
          <button class="btn-apply open-chat-btn" 
                  data-tid="${t.id}" 
                  data-tname="${t.name.replace(/'/g, "&apos;")}" 
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
        <p style="font-size:12px; opacity:0.6; margin-bottom:15px;">${h.location}</p>
        <button class="btn-apply" style="background:var(--white); color:var(--black)" onclick="window.open('${h.website_url}', '_blank')">VISIT EVENT</button>
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

// ── ACTION HANDLERS ──

async function submitTeam() {
  const roles = [...document.querySelectorAll('#role-inputs input')].map(i => i.value).filter(Boolean);
  const name = document.getElementById('h-name').value;
  if (!name || roles.length === 0) return showAlert("NAME & ROLES REQUIRED");

  try {
    const res = await fetch(`${API}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        name, 
        tech_stack: document.getElementById('h-tech').value.split(',').map(s => s.trim()),
        roles, 
        deadline: document.getElementById('h-date').value, 
        hackathon_id: document.getElementById('h-hack').value 
      })
    });
    if (res.ok) {
      closeModal('modal-host');
      fetchTeams();
      showAlert("TEAM PUBLISHED! ✅");
    }
  } catch (err) { showAlert("SUBMISSION FAILED"); }
}

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

// ── CHAT SYSTEM ──

function openChat(tid, name) {
  console.log(`Opening chat for team ${tid}: ${name}`);
  State.currentTid = tid;
  
  const titleEl = document.getElementById('chat-title');
  const msgsEl = document.getElementById('chat-msgs');
  
  if (titleEl) titleEl.textContent = name.toUpperCase();
  if (msgsEl) msgsEl.innerHTML = '<p style="text-align:center; padding:20px; opacity:0.5; font-weight:900;">SYNCING CHANNEL...</p>';
  
  openModal('modal-chat');
  
  // Join room
  console.log("Emitting join_room:", tid);
  socket.emit('join_room', tid);
  
  // Fetch History
  fetch(`${API}/chat/${tid}`, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(r => r.json())
    .then(msgs => {
      console.log(`Fetched ${msgs.length} messages`);
      if (msgsEl) {
        msgsEl.innerHTML = '';
        if (msgs.length === 0) {
          msgsEl.innerHTML = '<p style="text-align:center; padding:40px; opacity:0.2; font-weight:900;">NO MESSAGES YET</p>';
        } else {
          msgs.forEach(m => renderMsg(m));
        }
      }
    })
    .catch(err => {
      console.error("Chat history fetch failed:", err);
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
    <div>${m.content || m.message}</div>
  `;
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
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

// ── UTILS ──

function addRoleField() {
  const div = document.createElement('div');
  div.style.display = 'flex'; div.style.gap = '10px'; div.style.marginBottom = '10px';
  div.innerHTML = `<input type="text" placeholder="e.g. Frontend Dev" style="flex:1"><button class="btn-icon" style="width:45px; height:45px; background:var(--red); color:white;" onclick="this.parentElement.remove()"><i class="fa-solid fa-minus"></i></button>`;
  document.getElementById('role-inputs').appendChild(div);
}

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

async function fetchHackathons() {
  const res = await fetch(`${API}/hackathons`);
  const data = await res.json();
  const sel = document.getElementById('h-hack');
  if (sel) sel.innerHTML = '<option value="">NONE</option>' + data.map(h => `<option value="${h.id}">${h.name}</option>`).join('');
}

async function fetchNotifications() {
  const res = await fetch(`${API}/notifications`, { headers: { 'Authorization': `Bearer ${token}` } });
  const data = await res.json();
  const unread = data.filter(n => !n.is_read).length;
  const count = document.getElementById('notif-count');
  if (count) {
    count.style.display = unread > 0 ? 'flex' : 'none';
    count.textContent = unread;
  }
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