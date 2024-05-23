var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", {
    title: "RSS to Slack Notification Service is running",
  });
});

module.exports = router;
