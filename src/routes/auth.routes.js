const router = require("express").Router();

const { getAuthSummary, getUsersPayload, getUserById } = require("../services/erp.service");
const { sendSuccess, createHttpError } = require("../utils/http");
const { signDemoToken } = require("../middlewares/auth.middleware");

router.get("/me", (req, res) => {
  return sendSuccess(res, getAuthSummary(req.user.id), "Current ERP session loaded");
});

router.get("/roles", (req, res) => {
  return sendSuccess(res, getUsersPayload().roles, "Role catalogue loaded");
});

router.post("/login", (req, res, next) => {
  try {
    const email = `${req.body?.email || ""}`.trim().toLowerCase();
    const userId = `${req.body?.userId || ""}`.trim();
    const user =
      getUsersPayload().users.find((item) => item.email.toLowerCase() === email) ||
      getUserById(userId) ||
      getUserById("user-manager");

    if (!user) {
      throw createHttpError(404, "Demo ERP user not found");
    }

    return sendSuccess(
      res,
      {
        token: signDemoToken(user),
        user: getAuthSummary(user.id),
      },
      "Demo ERP session started",
    );
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (req, res) => {
  return sendSuccess(res, { loggedOut: true }, "Demo ERP session cleared");
});

module.exports = router;
