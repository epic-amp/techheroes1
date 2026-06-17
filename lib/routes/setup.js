const express = require("express");
const { sql } = require("../db");
const { signToken, hashPassword, asyncHandler } = require("../auth");

const router = express.Router();

/**
 * First-run bootstrap.
 * - GET  /api/setup/status  -> { needsSetup }  (true only while NO tutor exists)
 * - POST /api/setup         -> creates the first tutor, returns a token (auto-login)
 *
 * Once any tutor exists, POST /api/setup is permanently locked (403). This lets a
 * client stand up the platform on an empty database without a command line, and
 * there is no shipped/known password.
 */
router.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const rows = await sql`SELECT count(*)::int AS n FROM users WHERE role='tutor'`;
    res.json({ needsSetup: rows[0].n === 0 });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const existing = await sql`SELECT count(*)::int AS n FROM users WHERE role='tutor'`;
    if (existing[0].n > 0) return res.status(403).json({ error: "Setup already completed" });

    const { name, email, password } = req.body || {};
    if (!name || !email || !password)
      return res.status(400).json({ error: "name, email and password are required" });
    if (String(password).length < 8)
      return res.status(400).json({ error: "Password must be at least 8 characters" });

    const rows = await sql`
      INSERT INTO users (role, name, email, password)
      VALUES ('tutor', ${name}, ${String(email).toLowerCase()}, ${hashPassword(password)})
      RETURNING id, role, name, email, status, created_at`;
    res.status(201).json({ token: signToken(rows[0]), user: rows[0] });
  })
);

module.exports = router;
