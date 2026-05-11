const API = "http://127.0.0.1:5000/api";

// ── Toggle password visibility ──────────────────────────
function togglePassword(inputId, icon) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    icon.textContent = "🙈";
  } else {
    input.type = "password";
    icon.textContent = "👁";
  }
}

// ── Login form submit ───────────────────────────────────
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl  = document.getElementById("error-msg");
  const btn      = document.getElementById("login-btn");

  errorEl.textContent = "";

  // Basic client-side check
  if (!email || !password) {
    errorEl.textContent = "Please fill in all fields";
    return;
  }

  // Loading state
  btn.textContent = "Logging in...";
  btn.disabled    = true;

  try {
    const res  = await fetch(`${API}/auth/login`, {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error;   // e.g. "No account found" / "Incorrect password"
      return;
    }

    // Save token + user
    localStorage.setItem("token", data.token);
    localStorage.setItem("user",  JSON.stringify(data.user));

    // Redirect
    window.location.href = "../Dashboard/dashboard.html";

  } catch (err) {
    console.error("Login Error:", err);
    errorEl.textContent = "Cannot reach server. Please try again later.";
  } finally {
    btn.textContent = "Login";
    btn.disabled    = false;
  }
});