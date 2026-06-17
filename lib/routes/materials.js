const express = require("express");
const { sql } = require("../db");
const { asyncHandler } = require("../auth");
const { authenticate, authorize } = require("../middleware");

const router = express.Router();
router.use(authenticate);

// Students only see materials for their groups (or global, group_id IS NULL).
router.get(
  "/",
  asyncHandler(async (req, res) => {
    let rows;
    if (req.user.role === "student") {
      rows = await sql`
        SELECT m.* FROM materials m
        WHERE m.group_id IS NULL
           OR m.group_id IN (SELECT group_id FROM group_members WHERE user_id=${req.user.id})
        ORDER BY m.created_at DESC`;
    } else {
      rows = await sql`SELECT * FROM materials ORDER BY created_at DESC`;
    }
    res.json({ materials: rows });
  })
);

// Create material (tutor). Send JSON: { title, type, groupId, fileUrl }
// `fileUrl` is produced by uploading the binary to a blob store (see README).
router.post(
  "/",
  authorize("tutor"),
  asyncHandler(async (req, res) => {
    const { title, type, groupId, fileUrl } = req.body || {};
    if (!title) return res.status(400).json({ error: "title is required" });
    const rows = await sql`
      INSERT INTO materials (title,type,group_id,file_url)
      VALUES (${title},${type || "PDF"},${groupId || null},${fileUrl || null}) RETURNING *`;
    res.status(201).json({ material: rows[0] });
  })
);

router.delete(
  "/:id",
  authorize("tutor"),
  asyncHandler(async (req, res) => {
    const rows = await sql`DELETE FROM materials WHERE id=${req.params.id} RETURNING id`;
    if (!rows[0]) return res.status(404).json({ error: "Material not found" });
    res.status(204).end();
  })
);

module.exports = router;
