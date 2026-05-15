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

// ── Password strength checker ───────────────────────────
document.getElementById('signup-password').addEventListener('input', (e) => {
  const val = e.target.value;
  const fill = document.getElementById('strength-fill');
  const label = document.getElementById('strength-label');

  let strength = 0;
  if (val.length >= 6) strength++;
  if (val.length >= 10) strength++;
  if (/[A-Z]/.test(val)) strength++;
  if (/[0-9]/.test(val)) strength++;
  if (/[^A-Za-z0-9]/.test(val)) strength++;

  const levels = [
    { label: '', color: 'transparent', width: '0%' },
    { label: 'Weak', color: '#e53935', width: '25%' },
    { label: 'Fair', color: '#fb8c00', width: '50%' },
    { label: 'Good', color: '#fdd835', width: '75%' },
    { label: 'Strong', color: '#43a047', width: '90%' },
    { label: 'Very Strong', color: '#1b5e20', width: '100%' },
  ];

  const level = levels[strength];
  fill.style.width = level.width;
  fill.style.background = level.color;
  label.textContent = level.label;
  label.style.color = level.color;
});

// ── Signup form submit ──────────────────────────────────
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;
  const errorEl = document.getElementById('error-msg');
  const btn = document.getElementById('signup-btn');

  errorEl.style.color = '#e53935';
  errorEl.textContent = '';

  // ── Client-side validation ────────────────────────────
  if (!name || !email || !password || !confirm)
    return (errorEl.textContent = 'All fields are required');

  if (password.length < 6)
    return (errorEl.textContent = 'Password must be at least 6 characters');

  if (password !== confirm)
    return (errorEl.textContent = 'Passwords do not match');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return (errorEl.textContent = 'Enter a valid email address');

  // ── Loading state ─────────────────────────────────────
  btn.textContent = 'Creating account...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Registration failed. Please try again.';
      return;
    }

    // Success
    errorEl.style.color = '#43a047';
    errorEl.textContent = '✅ Account created! Redirecting to login...';

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);

  } catch (err) {
    errorEl.textContent = 'Cannot reach server. Is the backend running?';
  } finally {
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
});