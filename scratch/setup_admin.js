require('dotenv').config({ path: './backend/.env' });
const pool = require('../backend/db');

async function setupAdmin() {
  try {
    console.log("Adding is_admin column to users table...");
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_admin'
    `);

    if (checkColumn.rows.length === 0) {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN is_admin BOOLEAN DEFAULT FALSE
      `);
      console.log("Column is_admin added to users.");
    } else {
      console.log("Column is_admin already exists.");
    }

    // Optionally: Set the first user as admin for testing convenience
    const firstUser = await pool.query("SELECT id, name FROM users LIMIT 1");
    if (firstUser.rows.length > 0) {
        await pool.query("UPDATE users SET is_admin = TRUE WHERE id = $1", [firstUser.rows[0].id]);
        console.log(`User ${firstUser.rows[0].name} (ID: ${firstUser.rows[0].id}) is now an ADMIN.`);
    }

    console.log("Admin setup completed! 👑");
    process.exit(0);
  } catch (err) {
    console.error("Setup failed:", err.message);
    process.exit(1);
  }
}

setupAdmin();
