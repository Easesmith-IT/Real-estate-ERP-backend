const router = require("express").Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    module: "leads",
    message: "Leads routes are registered",
  });
});

module.exports = router;
