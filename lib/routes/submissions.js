const express = require("express");
const { sql } = require("../db");
const { asyncHandler } = require("../auth");
const { authenticate, authorize } = require("../middleware");

const router = express.Router();
router.use(authenticate);

// Student submits work. JSON: { assignmentId, comment, fileUrl }
router.post(
  "/",
  authorize("student"),
  asyncHandler(async (req, res) => {
    const { assignmentId, comment, fileUrl } = req.body || {};
    const aRows = await sql`SELECT id, deadline FROM assignments WHERE id=${assignmentId} LIMIT 1`;
    if (!aRows[0]) return res.status(404).json({ error: "Assignment not found" });

    const late = aRows[0].deadline && new Date(aRows[0].deadline) < new Date();
    const rows = await sql`
      INSERT INTO submissions (assignment_id,student_id,file_url,comment,status)
      VALUES (${assignmentId},${req.user.id},${fileUrl || null},${comment || ""},${late ? "late" : "submitted"})
      RETURNING *`;
    res.status(201).json({ submission: rows[0] });
  })
);

// Tutor lists submissions, optionally ?assignmentId=
router.get(
  "/",
  authorize("tutor"),
  asyncHandler(async (req, res) => {
    const { assignmentId } = req.query;
    const rows = assignmentId
      ? await sql`
          SELECT s.*, u.name AS student_name,
                 g.grade, g.letter, g.feedback
          FROM submissions s
          JOIN users u ON u.id=s.student_id
          LEFT JOIN grades g ON g.submission_id=s.id
          WHERE s.assignment_id=${assignmentId}
          ORDER BY s.submitted_at DESC`
      : await sql`
          SELECT s.*, u.name AS student_name,
                 g.grade, g.letter, g.feedback
          FROM submissions s
          JOIN users u ON u.id=s.student_id
          LEFT JOIN grades g ON g.submission_id=s.id
          ORDER BY s.submitted_at DESC`;
    res.json({ submissions: rows });
  })
);

module.exports = router;
