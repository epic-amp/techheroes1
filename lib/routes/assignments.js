const express = require("express");
const { sql } = require("../db");
const { asyncHandler } = require("../auth");
const { authenticate, authorize } = require("../middleware");

const router = express.Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    let rows;
    if (req.user.role === "student") {
      rows = await sql`
        SELECT a.* FROM assignments a
        WHERE a.group_id IS NULL
           OR a.group_id IN (SELECT group_id FROM group_members WHERE user_id=${req.user.id})
        ORDER BY a.created_at DESC`;
    } else {
      rows = await sql`SELECT * FROM assignments ORDER BY created_at DESC`;
    }

    // Attach a status per assignment (pending / submitted / late / graded).
    const result = [];
    for (const a of rows) {
      const subRows =
        req.user.role === "student"
          ? await sql`SELECT s.id, EXISTS(SELECT 1 FROM grades g WHERE g.submission_id=s.id) AS graded
                      FROM submissions s WHERE s.assignment_id=${a.id} AND s.student_id=${req.user.id} LIMIT 1`
          : [];
      let status;
      if (req.user.role === "student") {
        if (!subRows[0]) status = a.deadline && new Date(a.deadline) < new Date() ? "late" : "pending";
        else status = subRows[0].graded ? "graded" : "submitted";
      } else {
        status = "open";
      }
      result.push({ ...a, status });
    }
    res.json({ assignments: result });
  })
);

router.post(
  "/",
  authorize("tutor"),
  asyncHandler(async (req, res) => {
    const { title, description, deadline, groupId } = req.body || {};
    if (!title) return res.status(400).json({ error: "title is required" });
    const rows = await sql`
      INSERT INTO assignments (title,description,deadline,group_id)
      VALUES (${title},${description || ""},${deadline || null},${groupId || null}) RETURNING *`;
    res.status(201).json({ assignment: { ...rows[0], status: "pending" } });
  })
);

router.delete(
  "/:id",
  authorize("tutor"),
  asyncHandler(async (req, res) => {
    const rows = await sql`DELETE FROM assignments WHERE id=${req.params.id} RETURNING id`;
    if (!rows[0]) return res.status(404).json({ error: "Assignment not found" });
    res.status(204).end();
  })
);

module.exports = router;
