const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const {
  getSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  addSupportComment,
  getSupportOverview,
} = require("../services/support.service");
const { sendSuccess } = require("../utils/http");

router.get("/", requirePermission("users.read"), async (req, res, next) => {
  try {
    const overview = await getSupportOverview();
    const listing = await getSupportTickets({ page: 1, limit: 10 });
    return sendSuccess(
      res,
      {
        ...overview,
        tickets: listing.tickets,
        meta: listing.meta,
      },
      "Support overview loaded",
    );
  } catch (error) {
    return next(error);
  }
});

router.get("/tickets", requirePermission("users.read"), async (req, res, next) => {
  try {
    const data = await getSupportTickets(req.query || {});
    return sendSuccess(res, data, "Support tickets loaded");
  } catch (error) {
    return next(error);
  }
});

router.post("/tickets", requirePermission("auth.read"), async (req, res, next) => {
  try {
    const data = await createSupportTicket(req.body || {}, req.user.id);
    return sendSuccess(res, data, "Support ticket created");
  } catch (error) {
    return next(error);
  }
});

router.patch("/tickets/:ticketId", requirePermission("settings.write"), async (req, res, next) => {
  try {
    const data = await updateSupportTicket(req.params.ticketId, req.body || {});
    return sendSuccess(res, data, "Support ticket updated");
  } catch (error) {
    return next(error);
  }
});

router.post("/tickets/:ticketId/comments", requirePermission("auth.read"), async (req, res, next) => {
  try {
    const data = await addSupportComment(
      req.params.ticketId,
      req.body?.text,
      req.user.id,
    );
    return sendSuccess(res, data, "Support comment added");
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
