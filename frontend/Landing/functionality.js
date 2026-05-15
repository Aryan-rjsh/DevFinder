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
// Change this to your deployed backend URL when needed
const API_BASE = 'https://devfinder-backend-ll4g.onrender.com';

async function fetchStats() {
    try {
        const [usersRes, teamsRes] = await Promise.all([
            fetch(`${API_BASE}/api/users/count`),
            fetch(`${API_BASE}/api/teams/count`),
        ]);

        const usersData = usersRes.ok ? await usersRes.json() : null;
        const teamsData = teamsRes.ok ? await teamsRes.json() : null;

        return {
            users: usersData?.count ?? null,
            teams: teamsData?.count ?? null,
        };
    } catch (err) {
        console.error('Failed to fetch stats:', err);
        return { users: null, teams: null };
    }
}

// ── ABOUT ─────────────────────────────────
// FIX: Animate immediately with fallback values, then re-animate
// counters with real values when fetch resolves — no blocking wait.

function animateAbout() {
    const cards = document.querySelectorAll('#aboutModal .stat-card');

    // 1. Animate cards into view immediately using data-target as placeholder
    cards.forEach((card) => {
        const delay = parseInt(card.dataset.delay) || 0;
        setTimeout(() => {
            card.classList.add('visible');

            const numEl = card.querySelector('.stat-num');
            const fallback = parseInt(numEl.dataset.target) || 0;
            animateCounter(numEl, fallback);
        }, 200 + delay);
    });

    // 2. Fetch real stats in background — when ready, re-run counters for
    //    users/teams only (satisfaction card stays at its data-target value)
    fetchStats().then((stats) => {
        cards.forEach((card) => {
            const statKey = card.dataset.stat; // 'users' or 'teams'
            if (!statKey) return;              // skip satisfaction card

            const realValue = stats[statKey];
            if (realValue === null || isNaN(realValue)) return; // fetch failed

            const numEl = card.querySelector('.stat-num');
            // Only re-animate if the value actually differs from the fallback
            if (parseInt(numEl.textContent.replace(/,/g, '')) !== realValue) {
                animateCounter(numEl, realValue);
            }
        });
    });

    // 3. Feature blocks and terminal animate independently (no fetch dependency)
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
    if (target === null || target === undefined || isNaN(target)) {
        el.textContent = '0';
        return;
    }

    // Cancel any in-progress animation on this element
    if (el._animFrame) cancelAnimationFrame(el._animFrame);

    const duration = 1300;
    const start = performance.now();

    function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString();

        if (progress < 1) {
            el._animFrame = requestAnimationFrame(tick);
        } else {
            el.textContent = target.toLocaleString();
            el._animFrame = null;
        }
    }

    el._animFrame = requestAnimationFrame(tick);
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