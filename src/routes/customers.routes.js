const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const { listCustomers, createBroker, updateBroker, createCustomer } = require("../services/erp.service");
const { sendSuccess } = require("../utils/http");

router.get("/", requirePermission("customers.read"), (req, res) => {
  return sendSuccess(res, listCustomers(req.query), "Customers and broker data loaded");
});

router.get("/brokers", requirePermission("customers.read"), (req, res) => {
  return sendSuccess(res, listCustomers(req.query).brokers, "Broker register loaded");
});

router.post("/", requirePermission("customers.write"), (req, res, next) => {
  try {
    return Promise.resolve(createCustomer(req.body, req.user.id))
      .then((data) => sendSuccess(res, data, "Customer created"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.post("/brokers", requirePermission("customers.write"), (req, res, next) => {
  try {
    return Promise.resolve(createBroker(req.body, req.user.id))
      .then((data) => sendSuccess(res, data, "Broker created"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.patch("/brokers/:brokerId", requirePermission("customers.write"), (req, res, next) => {
  try {
    const { brokerId } = req.params;
    return Promise.resolve(updateBroker(brokerId, req.body, req.user.id))
      .then((data) => sendSuccess(res, data, "Broker updated"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
