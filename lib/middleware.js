const { verifyToken, asyncHandler } = require("./auth");
const { sql } = require("./db");

// Requires a valid Bearer token; loads the user from Neon and attaches req.user.
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const rows = await sql`
    SELECT id, role, name, student_id, email, status
    FROM users WHERE id = ${payload.sub} LIMIT 1`;
  if (!rows[0]) return res.status(401).json({ error: "User no longer exists" });

  req.user = rows[0];
  next();
});

// RBAC: authorize('tutor') etc. Use after authenticate.
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden: insufficient role" });
    next();
  };

module.exports = { authenticate, authorize };
