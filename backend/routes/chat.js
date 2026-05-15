const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const auth    = require("../middleware/auth");

// ── GET CHAT HISTORY ──────────────────────────────────
router.get("/:teamId", auth, async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user.id;

  try {
    // 1. Verify user is part of the team (host or accepted member)
    const teamCheck = await pool.query(`
      SELECT t.id FROM teams t
      LEFT JOIN applications a ON t.id = a.team_id
      WHERE t.id = $1 AND (t.created_by = $2 OR (a.applicant_id = $2 AND a.status = 'accepted'))
    `, [teamId, userId]);

    if (teamCheck.rows.length === 0) {
      return res.status(403).json({ error: "Unauthorized: You are not a member of this team" });
    }

    // 2. Fetch messages (joined with users to get names)
    const result = await pool.query(`
      SELECT m.*, u.name as sender_name 
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.team_id = $1 
      ORDER BY m.created_at ASC
    `, [teamId]);

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch chat history error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
