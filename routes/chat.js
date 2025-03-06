const express = require("express");
const {chatStream} = require("../controllers/chat.js");

const router = express.Router();

router.post("/web-bff/chatStream", (req, res, next) => {
    chatStream(req, res, next).catch(next);
});


module.exports = router;