// Neon serverless Postgres client.
// Uses the HTTP driver, which is ideal for serverless (no pooling headaches).
const { neon } = require("@neondatabase/serverless");

if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL is not set — database calls will fail until you add it in Vercel.");
}

// `sql` is a tagged-template function: await sql`SELECT * FROM users WHERE id = ${id}`
const sql = neon(process.env.DATABASE_URL || "");

module.exports = { sql };
