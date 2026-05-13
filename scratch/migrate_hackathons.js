require('dotenv').config({ path: './backend/.env' });
const pool = require('../backend/db');

async function setupHackathons() {
  try {
    console.log("Creating hackathons table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hackathons (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        website_url VARCHAR(255),
        start_date DATE,
        end_date DATE,
        location VARCHAR(255) DEFAULT 'Online',
        banner_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Adding hackathon_id to teams table...");
    // Check if column exists first to avoid error
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'teams' AND column_name = 'hackathon_id'
    `);

    if (checkColumn.rows.length === 0) {
      await pool.query(`
        ALTER TABLE teams 
        ADD COLUMN hackathon_id INTEGER REFERENCES hackathons(id) ON DELETE SET NULL
      `);
      console.log("Column hackathon_id added to teams.");
    } else {
      console.log("Column hackathon_id already exists.");
    }

    // Insert some sample data if table is empty
    const count = await pool.query("SELECT COUNT(*) FROM hackathons");
    if (parseInt(count.rows[0].count) === 0) {
      console.log("Inserting sample hackathons...");
      await pool.query(`
        INSERT INTO hackathons (name, description, website_url, start_date, end_date, location)
        VALUES 
        ('Global AI Hackathon', 'Build the next generation of AI tools.', 'https://example.com/ai', '2026-06-01', '2026-06-03', 'San Francisco'),
        ('Web3 Future', 'Exploring decentralized technologies.', 'https://example.com/web3', '2026-07-15', '2026-07-17', 'Online'),
        ('EcoTech Challenge', 'Solutions for a sustainable planet.', 'https://example.com/eco', '2026-08-20', '2026-08-22', 'London')
      `);
      console.log("Sample data inserted.");
    }

    console.log("Migration completed successfully! 🎉");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
}

setupHackathons();
