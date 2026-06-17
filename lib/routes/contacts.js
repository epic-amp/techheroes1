const express = require("express");
const { sql } = require("../db");
const { asyncHandler } = require("../auth");
const { authenticate } = require("../middleware");

const router = express.Router();
router.use(authenticate);

/**
 * Who the current user can chat with.
 * - tutor   -> every student (personal) + every group
 * - student -> the tutor(s) (personal) + their own groups
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    let people, groups;
    if (req.user.role === "tutor") {
      people = await sql`SELECT id, name, 'student' AS type FROM users WHERE role='student' ORDER BY name`;
      groups = await sql`SELECT id, name FROM groups ORDER BY name`;
    } else {
      people = await sql`SELECT id, name, 'tutor' AS type FROM users WHERE role='tutor' ORDER BY name`;
      groups = await sql`
        SELECT g.id, g.name FROM groups g
        JOIN group_members gm ON gm.group_id=g.id
        WHERE gm.user_id=${req.user.id} ORDER BY g.name`;
    }
    res.json({ people, groups });
  })
);

module.exports = router;
