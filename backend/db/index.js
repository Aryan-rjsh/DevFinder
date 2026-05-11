const { neon } = require("@neondatabase/serverless");
const dotenv = require("dotenv");
dotenv.config();

// Use the HTTP driver to bypass Port 5432 blocks
const sql = neon(process.env.DATABASE_URL);

// We wrap the sql function to maintain compatibility if you were using pool.query
const pool = {
  query: (text, params) => {
    // Neon HTTP driver handles parameters automatically via sql.query
    return sql.query(text, params).then(rows => ({ rows }));
  },
  connect: async () => {
    // HTTP is stateless, so "connecting" is just a quick check
    try {
      await sql`SELECT 1`;
      console.log("PostgreSQL connected via HTTP ✅");
    } catch (err) {
      console.error("DB Connection Error:", err.message);
    }
  }
};

// Auto-check connection on startup
pool.connect();

module.exports = pool;