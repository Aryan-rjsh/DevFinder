const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth");

// ── GET RECOMMENDED TEAMS (INTELLIGENT MATCHING) ─────
router.get("/recommended", auth, async (req, res) => {
  try {
    const userResult = await pool.query("SELECT skills FROM users WHERE id = $1", [req.user.id]);
    const skillsStr = userResult.rows[0].skills || "";
    const skillsArr = skillsStr.split(',').map(s => s.trim()).filter(Boolean);

    if (skillsArr.length === 0) {
      return res.json([]);
    }

    const query = `
      SELECT t.*, u.name as creator_name, u.is_verified, h.name as hackathon_name,
             (
               SELECT COUNT(*) FROM unnest(t.tech_stack) s 
               WHERE s ILIKE ANY($1)
             ) + (
               SELECT COUNT(*) FROM unnest(t.roles) r 
               WHERE r ILIKE ANY($1)
             ) as score
      FROM teams t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN hackathons h ON t.hackathon_id = h.id
      WHERE (t.tech_stack && $2 OR t.roles && $2)
      AND t.created_by != $3
      ORDER BY score DESC, t.created_at DESC
      LIMIT 10
    `;

    const patterns = skillsArr.map(s => `%${s}%`);
    const result = await pool.query(query, [patterns, skillsArr, req.user.id]);

    res.json(result.rows);
  } catch (err) {
    console.error("Recommendation error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET ALL TEAMS (WITH ADVANCED FILTERS) ─────────────
router.get("/", async (req, res) => {
  const { hackathon_id, role, tech } = req.query;
  try {
    let query = `
      SELECT t.*, u.name as creator_name, u.is_verified, h.name as hackathon_name
      FROM teams t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN hackathons h ON t.hackathon_id = h.id
      WHERE 1=1
    `;
    let params = [];

    if (hackathon_id) {
      params.push(hackathon_id);
      query += ` AND t.hackathon_id = $${params.length}`;
    }

    if (role) {
      params.push(`%${role}%`);
      query += ` AND EXISTS (SELECT 1 FROM unnest(t.roles) r WHERE r ILIKE $${params.length})`;
    }

    if (tech) {
      params.push(`%${tech}%`);
      query += ` AND EXISTS (SELECT 1 FROM unnest(t.tech_stack) s WHERE s ILIKE $${params.length})`;
    }

    query += ` ORDER BY t.is_featured DESC, t.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch teams error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ── CREATE A TEAM ─────────────────────────────────────
router.post("/", auth, async (req, res) => {
  const { name, description, tech_stack, roles, team_size, deadline, hackathon_id } = req.body;

  // hosted_by is derived from the auth token (req.user.id), not from the request body
  if (!name || !roles || !roles.length) {
    return res.status(400).json({ error: "Missing required fields: name and roles are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO teams (name, hosted_by, description, tech_stack, roles, team_size, deadline, created_by, hackathon_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        name,
        req.user.id,          // hosted_by = the logged-in user
        description || null,
        tech_stack || [],
        roles,
        team_size || 4,
        deadline || null,
        req.user.id,          // created_by = same
        hackathon_id || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create team error:", err.message);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// ── DELETE TEAM (OWNER OR ADMIN) ─────────────────────
router.delete("/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const check = await pool.query("SELECT created_by FROM teams WHERE id = $1", [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: "Team not found" });

    const userCheck = await pool.query("SELECT is_admin FROM users WHERE id = $1", [req.user.id]);
    const isAdmin = userCheck.rows[0].is_admin;

    if (check.rows[0].created_by !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await pool.query("DELETE FROM teams WHERE id = $1", [id]);
    res.json({ message: "Team deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Delete error" });
  }
});

// ── GET TEAMS I AM IN (HOST OR MEMBER) ────────────────
router.get("/my-teams", auth, async (req, res) => {
  const userId = req.user.id;
  try {
    const teamsResult = await pool.query(`
      SELECT DISTINCT t.*, u.name as creator_name
      FROM teams t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN applications a ON t.id = a.team_id
      WHERE t.created_by = $1 OR (a.applicant_id = $1 AND a.status = 'accepted')
      ORDER BY t.created_at DESC
    `, [userId]);

    const teams = teamsResult.rows;

    for (let team of teams) {
      const membersResult = await pool.query(`
        (SELECT u.id, u.name, u.email, 'HOST' as role_in_team
         FROM users u WHERE u.id = $1)
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