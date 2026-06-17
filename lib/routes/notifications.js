const express = require("express");
const { sql } = require("../db");
const { asyncHandler } = require("../auth");
const { authenticate } = require("../middleware");

const router = express.Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await sql`
      SELECT * FROM notifications WHERE user_id=${req.user.id} ORDER BY created_at DESC`;
    res.json({ notifications: rows, unread: rows.filter((n) => n.status === "unread").length });
  })
);

router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const rows = await sql`
      UPDATE notifications SET status='read' WHERE id=${req.params.id} AND user_id=${req.user.id} RETURNING *`;
    if (!rows[0]) return res.status(404).json({ error: "Notification not found" });
    res.json({ notification: rows[0] });
  })
);

router.patch(
  "/read-all",
  asyncHandler(async (req, res) => {
    await sql`UPDATE notifications SET status='read' WHERE user_id=${req.user.id}`;
    res.json({ ok: true });
  })
);

module.exports = router;
