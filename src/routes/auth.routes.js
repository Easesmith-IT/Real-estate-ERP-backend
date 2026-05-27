const router = require("express").Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    module: "auth",
    message: "Auth routes are registered",
  });
});

module.exports = router;
