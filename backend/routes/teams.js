const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const auth    = require("../middleware/auth");

// ── GET ALL TEAMS ─────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.name as creator_name 
      FROM teams t
      JOIN users u ON t.created_by = u.id
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch teams error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ── CREATE A TEAM ─────────────────────────────────────
router.post("/", auth, async (req, res) => {
  const { name, hosted_by, description, tech_stack, roles, team_size, deadline } = req.body;

  if (!name || !hosted_by || !roles || !roles.length) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO teams (name, hosted_by, description, tech_stack, roles, team_size, deadline, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, hosted_by, description, tech_stack, roles, team_size || 4, deadline, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create team error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
