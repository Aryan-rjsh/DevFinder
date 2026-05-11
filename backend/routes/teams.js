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

// ── GET TEAMS I AM IN (HOST OR MEMBER) ────────────────
router.get("/my-teams", auth, async (req, res) => {
  const userId = req.user.id;
  try {
    // 1. Get teams where user is host or has an accepted application
    const teamsResult = await pool.query(`
      SELECT DISTINCT t.*, u.name as creator_name
      FROM teams t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN applications a ON t.id = a.team_id
      WHERE t.created_by = $1 OR (a.applicant_id = $1 AND a.status = 'accepted')
      ORDER BY t.created_at DESC
    `, [userId]);

    const teams = teamsResult.rows;

    // 2. For each team, fetch all accepted members + the host
    for (let team of teams) {
      const membersResult = await pool.query(`
        (SELECT u.id, u.name, u.email, 'HOST' as role_in_team
         FROM users u
         WHERE u.id = $1)
        UNION
        (SELECT u.id, u.name, u.email, a.role as role_in_team
         FROM users u
         JOIN applications a ON u.id = a.applicant_id
         WHERE a.team_id = $2 AND a.status = 'accepted')
      `, [team.created_by, team.id]);
      
      team.members = membersResult.rows;
    }

    res.json(teams);
  } catch (err) {
    console.error("Fetch my teams error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
