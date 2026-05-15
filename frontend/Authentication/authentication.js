const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BASE_URL = IS_LOCAL ? 'http://127.0.0.1:5000' : 'https://devfinder-backend-ll4g.onrender.com';
const API = `${BASE_URL}/api`;

// ── Redirect if already logged in ──────────────────────
if (localStorage.getItem('token') && localStorage.getItem('user')) {
  window.location.href = '../Dashboard/dashboard.html';
}

// ── Toggle password visibility ──────────────────────────
function togglePassword(inputId, icon) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    icon.textContent = '🙈';
  } else {
    input.type = 'password';
    icon.textContent = '👁';
  }
}

// ── Social login placeholder ────────────────────────────
function socialComingSoon() {
  const errorEl = document.getElementById('error-msg');
  errorEl.style.color = '#f59e0b';
  errorEl.textContent = 'Social login coming soon!';
  setTimeout(() => { errorEl.textContent = ''; }, 3000);
}

// ── Login form submit ───────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('error-msg');
  const btn = document.getElementById('login-btn');

  errorEl.style.color = '#e53935';
  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Please fill in all fields';
    return;
  }

  btn.textContent = 'Logging in...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Login failed. Please try again.';
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    window.location.href = '../Dashboard/dashboard.html';

  } catch (err) {
    console.error('Login Error:', err);
    errorEl.textContent = 'Cannot reach server. Please try again later.';
  } finally {
    btn.textContent = 'Login';
    btn.disabled = false;
  }
});