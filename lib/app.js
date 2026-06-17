const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/**
 * On Vercel, this single function handles every /api/* request (see vercel.json).
 * Strip a leading "/api" so the routers below match cleanly regardless of how
 * Vercel forwards the path.
 */
app.use((req, _res, next) => {
  if (req.url === "/api") req.url = "/";
  else if (req.url.startsWith("/api/")) req.url = req.url.slice(4);
  next();
});

app.get("/", (_req, res) =>
  res.json({
    name: "TechHeroes API",
    roles: ["tutor", "student"],
    health: "ok",
    endpoints: [
      "GET  /api/setup/status",
      "POST /api/setup",
      "POST /api/auth/login/student",
      "POST /api/auth/login/tutor",
      "GET  /api/auth/me",
      "GET/POST/PUT/DELETE /api/students",
      "GET/POST/PUT/DELETE /api/groups (+ /:id/members)",
      "GET/POST/DELETE /api/materials",
      "GET/POST/DELETE /api/assignments",
      "GET/POST /api/submissions",
      "GET/POST /api/grades",
      "POST /api/messages · GET /api/messages/personal/:id · /group/:id",
      "GET/PATCH /api/notifications",
    ],
  })
);

app.use("/setup", require("./routes/setup"));
app.use("/auth", require("./routes/auth"));
app.use("/students", require("./routes/students"));
app.use("/groups", require("./routes/groups"));
app.use("/materials", require("./routes/materials"));
app.use("/assignments", require("./routes/assignments"));
app.use("/submissions", require("./routes/submissions"));
app.use("/grades", require("./routes/grades"));
app.use("/messages", require("./routes/messages"));
app.use("/notifications", require("./routes/notifications"));
app.use("/contacts", require("./routes/contacts"));

app.use((req, res) => res.status(404).json({ error: "Not found", path: req.url }));

// Final error handler — keeps responses as JSON.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

module.exports = app;
