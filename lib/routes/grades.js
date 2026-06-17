const express = require("express");
const { sql } = require("../db");
const { asyncHandler } = require("../auth");
const { authenticate, authorize } = require("../middleware");

const router = express.Router();
router.use(authenticate);

// Tutor grades a submission (upsert). JSON: { submissionId, grade, letter, feedback }
router.post(
  "/",
  authorize("tutor"),
  asyncHandler(async (req, res) => {
    const { submissionId, grade, letter, feedback } = req.body || {};
    const sub = await sql`SELECT id, student_id FROM submissions WHERE id=${submissionId} LIMIT 1`;
    if (!sub[0]) return res.status(404).json({ error: "Submission not found" });

    const rows = await sql`
      INSERT INTO grades (submission_id,grade,letter,feedback)
      VALUES (${submissionId},${grade},${letter || ""},${feedback || ""})
      ON CONFLICT (submission_id) DO UPDATE
        SET grade=EXCLUDED.grade, letter=EXCLUDED.letter, feedback=EXCLUDED.feedback
      RETURNING *`;

    await sql`
      INSERT INTO notifications (user_id,title,message)
      VALUES (${sub[0].student_id},'Grade published',${"Your submission was graded: " + grade})`;

    res.status(201).json({ grade: rows[0] });
  })
);

// View grades. Students see only their own.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows =
      req.user.role === "student"
        ? await sql`
            SELECT g.*, a.title AS assignment, u.id AS student_id, u.name AS student_name
            FROM grades g
            JOIN submissions s ON s.id=g.submission_id
            JOIN assignments a ON a.id=s.assignment_id
            JOIN users u ON u.id=s.student_id
            WHERE s.student_id=${req.user.id}
            ORDER BY g.created_at DESC`
        : await sql`
            SELECT g.*, a.title AS assignment, u.id AS student_id, u.name AS student_name
            FROM grades g
            JOIN submissions s ON s.id=g.submission_id
            JOIN assignments a ON a.id=s.assignment_id
            JOIN users u ON u.id=s.student_id
            ORDER BY g.created_at DESC`;
    res.json({ grades: rows });
  })
);

module.exports = router;
