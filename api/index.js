// Vercel routes every /api/* request here (see vercel.json).
// An Express app is itself a valid (req, res) handler, so we just export it.
module.exports = require("../lib/app");
