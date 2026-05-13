const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const auth    = require("../middleware/auth");

async function createNotification(userId, type, message, io) {
  try {
    const result = await pool.query(
      "INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3) RETURNING *",
      [userId, type, message]
    );
    if (io) {
      io.to(`user_${userId}`).emit("notification", result.rows[0]);
    }
  } catch (err) {
    console.error("Notification creation error:", err.message);
  }
}

// ── SUBMIT AN APPLICATION ────────────────────────────
router.post("/", auth, async (req, res) => {
  const { team_id, role, message } = req.body;
  const applicant_id = req.user.id;

  if (!team_id) return res.status(400).json({ error: "Team ID is required" });

  try {
    // 1. Check if team exists
    const teamCheck = await pool.query("SELECT id, created_by FROM teams WHERE id = $1", [team_id]);
    if (teamCheck.rows.length === 0) return res.status(404).json({ error: "Team not found" });

    // 2. Prevent host from applying to their own team
    if (teamCheck.rows[0].created_by === applicant_id) {
      return res.status(400).json({ error: "You cannot apply to your own team" });
    }

    // 3. Check if already applied
    const exists = await pool.query(
      "SELECT id FROM applications WHERE team_id = $1 AND applicant_id = $2",
      [team_id, applicant_id]
    );
    if (exists.rows.length > 0) return res.status(409).json({ error: "Application already submitted" });

    // 4. Insert application
    const result = await pool.query(
      `INSERT INTO applications (team_id, applicant_id, role, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [team_id, applicant_id, role, message]
    );

    // Notify Host
    const hostId = teamCheck.rows[0].created_by;
    const applicantName = req.user.name;
    const teamName = (await pool.query("SELECT name FROM teams WHERE id = $1", [team_id])).rows[0].name;
    
    createNotification(
      hostId, 
      'application_received', 
      `${applicantName} applied to join "${teamName}" as ${role}`,
      req.io
    );

    res.status(201).json({ message: "Application submitted successfully", application: result.rows[0] });

  } catch (err) {
    console.error("Apply error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET MY APPLICATIONS ──────────────────────────────
router.get("/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, t.name as team_name, t.hosted_by
       FROM applications a
       JOIN teams t ON a.team_id = t.id
       WHERE a.applicant_id = $1
       ORDER BY a.applied_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch my applications error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET APPLICANTS FOR MY TEAM ───────────────────────
router.get("/team/:teamId", auth, async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user.id;

  try {
    // Verify user owns the team
    const team = await pool.query("SELECT id FROM teams WHERE id = $1 AND created_by = $2", [teamId, userId]);
    if (team.rows.length === 0) return res.status(403).json({ error: "Unauthorized" });

    const result = await pool.query(
      `SELECT a.*, u.id as applicant_id, u.name as applicant_name, u.email as applicant_email, u.skills, u.github_url, u.linkedin_url, u.bio
       FROM applications a
       JOIN users u ON a.applicant_id = u.id
       WHERE a.team_id = $1
       ORDER BY a.applied_at DESC`,
      [teamId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch applicants error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ── UPDATE STATUS (ACCEPT/REJECT) ────────────────────
router.put("/:id/status", auth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'accepted' or 'rejected'
  const userId = req.user.id;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    // Verify user owns the team associated with this application
    const appCheck = await pool.query(
      `SELECT a.id, t.created_by 
       FROM applications a
       JOIN teams t ON a.team_id = t.id
       WHERE a.id = $1`, [id]
    );

    if (appCheck.rows.length === 0) return res.status(404).json({ error: "Application not found" });
    if (appCheck.rows[0].created_by !== userId) return res.status(403).json({ error: "Unauthorized" });

    // Capacity Check
    if (status === 'accepted') {
      const capacityCheck = await pool.query(`
        SELECT t.team_size, COUNT(a.id) as current_members
        FROM teams t
        LEFT JOIN applications a ON t.id = a.team_id AND a.status = 'accepted'
        WHERE t.id = (SELECT team_id FROM applications WHERE id = $1)
        GROUP BY t.team_size
      `, [id]);

      if (capacityCheck.rows.length > 0) {
        const { team_size, current_members } = capacityCheck.rows[0];
        // team_size is total capacity (including host), so members allowed = team_size - 1
        if (parseInt(current_members) >= (team_size - 1)) {
          return res.status(400).json({ error: "This team has reached its maximum member capacity" });
        }
      }
    }

    const result = await pool.query(
      "UPDATE applications SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );

    // Notify Applicant
    const applicantId = result.rows[0].applicant_id;
    const teamId = result.rows[0].team_id;
    const teamNameResult = await pool.query("SELECT name FROM teams WHERE id = $1", [teamId]);
    const teamName = teamNameResult.rows[0].name;

    createNotification(
      applicantId,
      `application_${status}`,
      `Your application for "${teamName}" has been ${status}`,
      req.io
    );

    res.json({ message: `Application ${status}`, application: result.rows[0] });

  } catch (err) {
    console.error("Update status error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
