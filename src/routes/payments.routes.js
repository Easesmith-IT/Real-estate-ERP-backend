const router = require("express").Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    module: "payments",
    message: "Payments routes are registered",
  });
});

module.exports = router;
