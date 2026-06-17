const express = require("express");
const { sql } = require("../db");
const { asyncHandler } = require("../auth");
const { authenticate } = require("../middleware");

const router = express.Router();
router.use(authenticate);

/**
 * Send a message. JSON: { to?, groupId?, content, attachment? }
 * Real-time on Vercel = clients poll the history endpoints below every few seconds.
 * (For push-realtime add Ably/Pusher; the send/store logic stays the same.)
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { to, groupId, content, attachment } = req.body || {};
    if (!content && !attachment) return res.status(400).json({ error: "Empty message" });
    if (!to && !groupId) return res.status(400).json({ error: "to or groupId is required" });

    const rows = await sql`
      INSERT INTO messages (sender_id,receiver_id,group_id,content,attachment)
      VALUES (${req.user.id},${to || null},${groupId || null},${content || null},${attachment || null})
      RETURNING *`;

    if (to) {
      await sql`
        INSERT INTO notifications (user_id,title,message)
        VALUES (${to},'New message',${req.user.name + ": " + String(content || "Attachment").slice(0, 40)})`;
    }
    res.status(201).json({ message: rows[0] });
  })
);

// Personal thread between current user and :otherUserId. Optional ?after=ISO for polling.
router.get(
  "/personal/:otherUserId",
  asyncHandler(async (req, res) => {
    const me = req.user.id;
    const other = req.params.otherUserId;
    const after = req.query.after || "1970-01-01";
    const rows = await sql`
      SELECT * FROM messages
      WHERE group_id IS NULL
        AND ((sender_id=${me} AND receiver_id=${other}) OR (sender_id=${other} AND receiver_id=${me}))
        AND created_at > ${after}
      ORDER BY created_at ASC`;
    res.json({ messages: rows });
  })
);

// Group thread. Students must belong to the group. Optional ?after=ISO.
router.get(
  "/group/:groupId",
  asyncHandler(async (req, res) => {
    const groupId = req.params.groupId;
    if (req.user.role === "student") {
      const member = await sql`SELECT 1 FROM group_members WHERE group_id=${groupId} AND user_id=${req.user.id} LIMIT 1`;
      if (!member[0]) return res.status(403).json({ error: "Not a member of this group" });
    }
    const after = req.query.after || "1970-01-01";
    const rows = await sql`
      SELECT m.*, u.name AS sender_name FROM messages m
      JOIN users u ON u.id=m.sender_id
      WHERE m.group_id=${groupId} AND m.created_at > ${after}
      ORDER BY m.created_at ASC`;
    res.json({ messages: rows });
  })
);

module.exports = router;
