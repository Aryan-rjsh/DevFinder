const pool = require('../backend/db');

async function setupMessagesTable() {
  try {
    console.log("Creating messages table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        sender_name VARCHAR(255),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Messages table created successfully ✅");
  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    process.exit();
  }
}

setupMessagesTable();
