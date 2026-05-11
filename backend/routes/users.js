const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const auth    = require("../middleware/auth");

// ── GET CURRENT USER (ME) ─────────────────────────────
router.get("/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, skills, bio, github_url, linkedin_url, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Fetch profile error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ── UPDATE PROFILE ─────────────────────────────────────
router.put("/profile", auth, async (req, res) => {
  const { name, bio, skills, github_url, linkedin_url } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users 
       SET name = $1, bio = $2, skills = $3, github_url = $4, linkedin_url = $5
       WHERE id = $6
       RETURNING id, name, email, skills, bio, github_url, linkedin_url, created_at`,
      [name, bio, skills, github_url, linkedin_url, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update profile error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
