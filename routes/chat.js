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
  documentGenerationBedRock,
} = require("../controllers/chat.js");

const router = express.Router();

router.post("/chatStream", (req, res, next) => {
  chatStream(req, res, next).catch(next);
});

router.get("/chatStream/:jobId", (req, res, next) => {
  getJobStatus(req, res, next).catch(next);
});

router.post("/requirement-capture", upload.single("file"), requirementCapture);

router.post(
  "/document-generation-bedrock",
  upload.single("file"),
  documentGenerationBedRock
);

module.exports = router;
