const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const auth    = require("../middleware/auth");

// Middleware to check if user is admin
const adminOnly = async (req, res, next) => {
  try {
    const result = await pool.query("SELECT is_admin FROM users WHERE id = $1", [req.user.id]);
    if (!result.rows[0].is_admin) {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Auth error" });
  }
};

// ── BROADCAST NOTIFICATION TO ALL USERS ───────────────
router.post("/broadcast", auth, adminOnly, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const users = await pool.query("SELECT id FROM users");
    const queries = users.rows.map(u => 
      pool.query(
        "INSERT INTO notifications (user_id, message, is_read) VALUES ($1, $2, FALSE) RETURNING *",
        [u.id, `📢 BROADCAST: ${message}`]
      )
    );
    await Promise.all(queries);

    const io = req.app.get("socketio");
    if (io) {
      io.emit("notification", {
        message: `📢 BROADCAST: ${message}`,
        created_at: new Date(),
        is_read: false
      });
    }

    res.json({ message: `Broadcast sent to ${users.rowCount} users!` });
  } catch (err) {
    console.error("Broadcast error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET PLATFORM STATS ────────────────────────────────
router.get("/stats", auth, adminOnly, async (req, res) => {
  try {
    const totalUsers = await pool.query("SELECT COUNT(*) FROM users");
    const totalTeams = await pool.query("SELECT COUNT(*) FROM teams");
    const totalApps  = await pool.query("SELECT COUNT(*) FROM applications");
    const topTech    = await pool.query(`
      SELECT tech, COUNT(*) as count 
      FROM (SELECT unnest(tech_stack) as tech FROM teams) t 
      GROUP BY tech 
      ORDER BY count DESC 
      LIMIT 5
    `);

    res.json({
      users: totalUsers.rows[0].count,
      teams: totalTeams.rows[0].count,
      applications: totalApps.rows[0].count,
      popular_tech: topTech.rows
    });
  } catch (err) {
    res.status(500).json({ error: "Stats error" });
  }
});

// ── VERIFY A USER ─────────────────────────────────────
router.put("/verify-user/:id", auth, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { verify } = req.body;
  try {
    await pool.query("UPDATE users SET is_verified = $1 WHERE id = $2", [verify, id]);
    res.json({ message: `User ${verify ? 'verified' : 'unverified'} successfully!` });
  } catch (err) {
    res.status(500).json({ error: "Verification error" });
  }
});

// ── FEATURE/UNFEATURE A TEAM ─────────────────────────
router.put("/feature-team/:id", auth, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { is_featured } = req.body;
  try {
    await pool.query("UPDATE teams SET is_featured = $1 WHERE id = $2", [is_featured, id]);
    res.json({ message: `Team ${is_featured ? 'featured' : 'unfeatured'} successfully!` });
  } catch (err) {
    res.status(500).json({ error: "Feature error" });
  }
});

module.exports = router;
