const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const {
  listBookings,
  createBooking,
  cancelBooking,
} = require("../services/erp.service");
const { sendSuccess } = require("../utils/http");

router.get("/", requirePermission("bookings.read"), (req, res) => {
  return sendSuccess(res, listBookings(), "Bookings loaded");
});

router.post("/", requirePermission("bookings.write"), (req, res, next) => {
  try {
    return Promise.resolve(createBooking(req.body, req.user.id))
      .then((data) => sendSuccess(res, data, "Booking created"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.patch("/:bookingId/cancel", requirePermission("bookings.write"), (req, res, next) => {
  try {
    return Promise.resolve(cancelBooking(req.params.bookingId, req.body, req.user.id))
      .then((data) => sendSuccess(res, data, "Booking cancelled"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
