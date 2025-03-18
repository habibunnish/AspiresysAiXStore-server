const express = require("express");
const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});
const {
  chatStream,
  getJobStatus,
  requirementCapture,
} = require("../controllers/chat.js");

const router = express.Router();

router.post("/web-bff/chatStream", (req, res, next) => {
  chatStream(req, res, next).catch(next);
});

router.get("/web-bff/chatStream/:jobId", (req, res, next) => {
  getJobStatus(req, res, next).catch(next);
});

router.post(
  "/web-bff/requirement-capture",
  upload.single("file"),
  requirementCapture
);

module.exports = router;
