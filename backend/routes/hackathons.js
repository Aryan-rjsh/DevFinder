const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const auth    = require("../middleware/auth");

// ── GET ALL HACKATHONS ────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM hackathons ORDER BY start_date ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch hackathons error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET HACKATHON BY ID ───────────────────────────────
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM hackathons WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Hackathon not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Fetch hackathon error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET TEAMS FOR A HACKATHON ──────────────────────────
router.get("/:id/teams", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT t.*, u.name as creator_name 
      FROM teams t
      JOIN users u ON t.created_by = u.id
      WHERE t.hackathon_id = $1
      ORDER BY t.created_at DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch hackathon teams error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ── CREATE HACKATHON (ADMIN ONLY) ─────────────────────
router.post("/", auth, async (req, res) => {
  const { name, description, website_url, start_date, end_date, location, banner_url } = req.body;

  if (!name) return res.status(400).json({ error: "Name is required" });

  try {
    // Check if user is admin
    const userRes = await pool.query("SELECT is_admin FROM users WHERE id = $1", [req.user.id]);
    if (!userRes.rows[0].is_admin) {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const result = await pool.query(
      `INSERT INTO hackathons (name, description, website_url, start_date, end_date, location, banner_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, description, website_url, start_date, end_date, location || 'Online', banner_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create hackathon error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ── DELETE HACKATHON (ADMIN ONLY) ─────────────────────
router.delete("/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    // Check if user is admin
    const userRes = await pool.query("SELECT is_admin FROM users WHERE id = $1", [req.user.id]);
    if (!userRes.rows[0].is_admin) {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }

    await pool.query("DELETE FROM hackathons WHERE id = $1", [id]);
    res.json({ message: "Hackathon deleted successfully" });
  } catch (err) {
    console.error("Delete hackathon error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
