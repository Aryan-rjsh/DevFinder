const pool = require('../backend/db');

async function setupNotificationsTable() {
  try {
    console.log("Creating notifications table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50), -- 'application_received', 'application_accepted', 'application_rejected'
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Notifications table created successfully ✅");
  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    process.exit();
  }
}

setupNotificationsTable();
