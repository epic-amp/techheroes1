const express = require("express");
const { verifyToken } = require("../auth");

const router = express.Router();

// Accepted document/image types for materials and submissions.
const ALLOWED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/zip", "application/x-zip-compressed",
  "image/jpeg", "image/png",
];

/**
 * POST /api/upload
 * Vercel Blob "client upload" handshake. The browser calls this to get a
 * short-lived token, then uploads the file directly to Blob (so big files never
 * pass through this function). The logged-in user's JWT is sent via clientPayload.
 *
 * Requires a Blob store connected to the project (Vercel → Storage → Blob),
 * which provides BLOB_READ_WRITE_TOKEN automatically.
 */
router.post("/", async (req, res) => {
  try {
    const { handleUpload } = await import("@vercel/blob/client");
    const result = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        let payload;
        try {
          payload = verifyToken(JSON.parse(clientPayload || "{}").token);
        } catch {
          throw new Error("Not authorized to upload");
        }
        return {
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: 25 * 1024 * 1024, // 25 MB
          tokenPayload: JSON.stringify({ sub: payload.sub, role: payload.role }),
        };
      },
      onUploadCompleted: async () => {
        // No-op: the URL is persisted when the material/submission is created.
      },
    });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
