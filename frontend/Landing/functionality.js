// ── OPEN / CLOSE ─────────────────────────

function openModal(overlayId) {
    const overlay = document.getElementById(overlayId);
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    triggerAnimations(overlayId);
}

function closeModal(overlayId) {
    const overlay = document.getElementById(overlayId);
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    resetAnimations(overlayId);
}

document.getElementById('aboutBtn').addEventListener('click', () => openModal('aboutOverlay'));
document.getElementById('contactBtn').addEventListener('click', () => openModal('contactOverlay'));
document.getElementById('closeAbout').addEventListener('click', () => closeModal('aboutOverlay'));
document.getElementById('closeContact').addEventListener('click', () => closeModal('contactOverlay'));

document.getElementById('aboutOverlay').addEventListener('click', function (e) {
    if (e.target === this) closeModal('aboutOverlay');
});
document.getElementById('contactOverlay').addEventListener('click', function (e) {
    if (e.target === this) closeModal('contactOverlay');
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal('aboutOverlay');
        closeModal('contactOverlay');
    }
});

// ── TRIGGER / RESET ───────────────────────

function triggerAnimations(overlayId) {
    if (overlayId === 'aboutOverlay') animateAbout();
    else if (overlayId === 'contactOverlay') animateContact();
}

function resetAnimations(overlayId) {
    if (overlayId === 'aboutOverlay') {
        document.querySelectorAll('#aboutModal .stat-card').forEach(el => el.classList.remove('visible'));
        document.querySelectorAll('#aboutModal .stat-num').forEach(el => el.textContent = '0');
        document.querySelectorAll('#aboutModal .feature-block').forEach(el => el.classList.remove('visible'));
        document.querySelectorAll('#aboutModal .terminal-line').forEach(el => el.classList.remove('visible'));
    } else {
        document.querySelectorAll('#contactModal .contact-card').forEach(el => el.classList.remove('visible'));
    }
}

// ── FETCH REAL STATS FROM BACKEND ─────────

const API_BASE = 'http://localhost:5000'; // Change to your deployed backend URL if needed

async function fetchStats() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/stats`, {
            headers: {
                // Admin stats endpoint requires auth — use a public stats endpoint if available,
                // otherwise fall back to individual public counts below.
            }
        });

        if (res.ok) {
            const data = await res.json();
            return {
                users: parseInt(data.users) || null,
                teams: parseInt(data.teams) || null,
            };
        }
    } catch (_) { }

    // Fallback: hit public-accessible endpoints for counts
    try {
        const [usersRes, teamsRes] = await Promise.all([
            fetch(`${API_BASE}/api/users/count`),
            fetch(`${API_BASE}/api/teams/count`),
        ]);

        const users = usersRes.ok ? (await usersRes.json()).count : null;
        const teams = teamsRes.ok ? (await teamsRes.json()).count : null;
        return { users, teams };
    } catch (_) { }

    return { users: null, teams: null };
}

// ── ABOUT ─────────────────────────────────

async function animateAbout() {
    // Fetch live stats first (non-blocking — show animation regardless)
    const statsPromise = fetchStats();

    document.querySelectorAll('#aboutModal .stat-card').forEach((card) => {
        const delay = parseInt(card.dataset.delay) || 0;
        setTimeout(async () => {
            card.classList.add('visible');

            const numEl = card.querySelector('.stat-num');
            const originalTarget = parseInt(numEl.dataset.target);
            const statKey = card.dataset.stat; // 'users', 'teams', or undefined

            let target = originalTarget;

            if (statKey === 'users' || statKey === 'teams') {
                try {
                    const stats = await statsPromise;
                    if (stats[statKey] !== null && !isNaN(stats[statKey])) {
                        target = stats[statKey];
                        // Update the data-target so reset works correctly
                        numEl.dataset.target = target;
                    }
                } catch (_) { }
            }

            animateCounter(numEl, target);
        }, 200 + delay);
    });

    document.querySelectorAll('#aboutModal .feature-block').forEach((block) => {
        const delay = parseInt(block.dataset.delay) || 0;
        setTimeout(() => block.classList.add('visible'), 550 + delay);
    });

    document.querySelectorAll('#aboutModal .terminal-line').forEach((line) => {
        const delay = parseInt(line.dataset.delay) || 0;
        setTimeout(() => line.classList.add('visible'), 801 + delay);
    });
}

// ── COUNTER ───────────────────────────────

function animateCounter(el, target) {
    if (target === undefined || target === null) {
        target = parseInt(el.dataset.target);
    }
    const duration = 1300;
    const start = performance.now();

    function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString();
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(tick);
}

// ── CONTACT ───────────────────────────────

function animateContact() {
    document.querySelectorAll('#contactModal .contact-card').forEach((card) => {
        const delay = parseInt(card.dataset.delay) || 0;
        setTimeout(() => card.classList.add('visible'), 200 + delay);
    });
}

// ── FORM ──────────────────────────────────

document.getElementById('sendBtn').addEventListener('click', () => {
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();
    const feedback = document.getElementById('formFeedback');

    feedback.className = 'form-feedback';
    feedback.textContent = '';

    if (!name || !email || !message) {
        feedback.classList.add('err');
        feedback.textContent = '// All fields are required';
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        feedback.classList.add('err');
        feedback.textContent = '// Invalid email address';
        return;
    }

    const btn = document.getElementById('sendBtn');
    btn.textContent = 'Sending...';
    btn.disabled = true;

    // Open user's mail client with prefilled content
    const subject = encodeURIComponent(`DevFinder Contact: Message from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
    window.location.href = `mailto:hello@devfinder.io?subject=${subject}&body=${body}`;

    setTimeout(() => {
        feedback.classList.add('ok');
        feedback.textContent = '// Mail client opened. We will be in touch.';
        btn.textContent = 'Sent';

        document.getElementById('contactName').value = '';
        document.getElementById('contactEmail').value = '';
        document.getElementById('contactMessage').value = '';

        setTimeout(() => {
            btn.textContent = 'Send Message \u2192';
            btn.disabled = false;
            feedback.textContent = '';
            feedback.className = 'form-feedback';
        }, 4000);
    }, 600);
});