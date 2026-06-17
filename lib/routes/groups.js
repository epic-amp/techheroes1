const express = require("express");
const { sql } = require("../db");
const { asyncHandler } = require("../auth");
const { authenticate, authorize } = require("../middleware");

const router = express.Router();
router.use(authenticate);

async function withMembers(g) {
  const members = await sql`
    SELECT u.id,u.name,u.student_id,u.email
    FROM users u JOIN group_members gm ON gm.user_id=u.id
    WHERE gm.group_id=${g.id} ORDER BY u.name`;
  return { ...g, members, memberCount: members.length };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    let groups;
    if (req.user.role === "student") {
      groups = await sql`
        SELECT g.* FROM groups g JOIN group_members gm ON gm.group_id=g.id
        WHERE gm.user_id=${req.user.id} ORDER BY g.name`;
    } else {
      groups = await sql`SELECT * FROM groups ORDER BY name`;
    }
    res.json({ groups: await Promise.all(groups.map(withMembers)) });
  })
);

router.post(
  "/",
  authorize("tutor"),
  asyncHandler(async (req, res) => {
    const { name, description } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });
    const rows = await sql`INSERT INTO groups (name,description) VALUES (${name},${description || ""}) RETURNING *`;
    res.status(201).json({ group: await withMembers(rows[0]) });
  })
);

router.put(
  "/:id",
  authorize("tutor"),
  asyncHandler(async (req, res) => {
    const { name, description } = req.body || {};
    const rows = await sql`
      UPDATE groups SET name=COALESCE(${name ?? null},name), description=COALESCE(${description ?? null},description)
      WHERE id=${req.params.id} RETURNING *`;
    if (!rows[0]) return res.status(404).json({ error: "Group not found" });
    res.json({ group: await withMembers(rows[0]) });
  })
);

router.delete(
  "/:id",
  authorize("tutor"),
  asyncHandler(async (req, res) => {
    const rows = await sql`DELETE FROM groups WHERE id=${req.params.id} RETURNING id`;
    if (!rows[0]) return res.status(404).json({ error: "Group not found" });
    res.status(204).end();
  })
);

router.post(
  "/:id/members",
  authorize("tutor"),
  asyncHandler(async (req, res) => {
    const { userId } = req.body || {};
    await sql`INSERT INTO group_members (group_id,user_id) VALUES (${req.params.id},${userId})
              ON CONFLICT DO NOTHING`;
    res.status(201).json({ ok: true });
  })
);

router.delete(
  "/:id/members/:userId",
  authorize("tutor"),
  asyncHandler(async (req, res) => {
    await sql`DELETE FROM group_members WHERE group_id=${req.params.id} AND user_id=${req.params.userId}`;
    res.status(204).end();
  })
);

module.exports = router;
