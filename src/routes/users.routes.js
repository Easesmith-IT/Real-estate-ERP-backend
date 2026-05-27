const router = require("express").Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    module: "users",
    message: "Users routes are registered",
  });
});

module.exports = router;
