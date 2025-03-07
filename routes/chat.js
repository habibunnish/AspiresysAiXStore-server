const express = require("express");
const {chatStream,getJobStatus} = require("../controllers/chat.js");

const router = express.Router();

router.post("/web-bff/chatStream", (req, res, next) => {
    chatStream(req, res, next).catch(next);
});

router.get("/web-bff/chatStream/:jobId", (req, res, next) => {
getJobStatus(req, res, next).catch(next);
});


module.exports = router;