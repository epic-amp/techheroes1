const express = require("express");
const { sql } = require("../db");
const { hashPassword, asyncHandler } = require("../auth");
const { authenticate, authorize } = require("../middleware");

const router = express.Router();
router.use(authenticate);

// List students (tutor). Optional ?q= and ?groupId=
router.get(
  "/",
  authorize("tutor"),
  asyncHandler(async (req, res) => {
    const { q, groupId } = req.query;
    let rows;
    if (groupId) {
      rows = await sql`
        SELECT u.id,u.role,u.name,u.student_id,u.email,u.status,u.created_at
        FROM users u JOIN group_members gm ON gm.user_id=u.id
        WHERE u.role='student' AND gm.group_id=${groupId}
        ORDER BY u.name`;
    } else {
      rows = await sql`
        SELECT id,role,name,student_id,email,status,created_at
        FROM users WHERE role='student' ORDER BY name`;
    }
    if (q) {
      const n = String(q).toLowerCase();
      rows = rows.filter((u) => u.name.toLowerCase().includes(n) || (u.student_id || "").toLowerCase().includes(n));
    }
    res.json({ students: rows });
  })
);

router.post(
  "/",
  authorize("tutor"),
  asyncHandler(async (req, res) => {
    const { name, studentId, email, password, status = "active" } = req.body || {};
    if (!name || !studentId) return res.status(400).json({ error: "name and studentId are required" });
    const pw = hashPassword(password || process.env.DEMO_PASSWORD || "demo1234");
    try {
      const rows = await sql`
        INSERT INTO users (role,name,student_id,email,password,status)
        VALUES ('student',${name},${String(studentId).toUpperCase()},${email || null},${pw},${status})
        RETURNING id,role,name,student_id,email,status,created_at`;
      res.status(201).json({ student: rows[0] });
    } catch (e) {
      if (String(e.message).includes("duplicate")) return res.status(409).json({ error: "Student ID or email already exists" });
      throw e;
    }
  })
);

router.put(
  "/:id",
  authorize("tutor"),
  asyncHandler(async (req, res) => {
    const { name, email, status } = req.body || {};
    const rows = await sql`
      UPDATE users SET
        name   = COALESCE(${name ?? null}, name),
        email  = COALESCE(${email ?? null}, email),
        status = COALESCE(${status ?? null}, status)
      WHERE id=${req.params.id} AND role='student'
      RETURNING id,role,name,student_id,email,status,created_at`;
    if (!rows[0]) return res.status(404).json({ error: "Student not found" });
    res.json({ student: rows[0] });
  })
);

router.delete(
  "/:id",
  authorize("tutor"),
  asyncHandler(async (req, res) => {
    const rows = await sql`DELETE FROM users WHERE id=${req.params.id} AND role='student' RETURNING id`;
    if (!rows[0]) return res.status(404).json({ error: "Student not found" });
    res.status(204).end();
  })
);

module.exports = router;
