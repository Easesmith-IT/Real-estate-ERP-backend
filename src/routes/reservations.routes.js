const router = require("express").Router();
const { requirePermission } = require("../middlewares/auth.middleware");
const { listReservations, createReservation, releaseReservation } = require("../services/erp.service");
const { sendSuccess } = require("../utils/http");

router.get("/", requirePermission("bookings.read"), (req, res) => {
  return sendSuccess(res, listReservations(), "Reservations loaded");
});

router.post("/", requirePermission("bookings.write"), (req, res, next) => {
  try {
    return Promise.resolve(createReservation(req.body, req.user.id))
      .then((data) => sendSuccess(res, data, "Unit reserved"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:reservationId", requirePermission("bookings.write"), (req, res, next) => {
  try {
    return Promise.resolve(releaseReservation(req.params.reservationId, req.user.id))
      .then((data) => sendSuccess(res, data, "Reservation released"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.patch("/:reservationId/release", requirePermission("bookings.write"), (req, res, next) => {
  try {
    return Promise.resolve(releaseReservation(req.params.reservationId, req.user.id))
      .then((data) => sendSuccess(res, data, "Reservation released"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
