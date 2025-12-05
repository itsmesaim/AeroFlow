const express = require("express");
const {
  getPassengers,
  getPassenger,
  createPassenger,
  updatePassenger,
  deletePassenger,
  searchByPassport,
} = require("../controllers/passengerController");

const router = express.Router();

const { protect, authorize } = require("../middleware/auth");

// All routes are protected
router.use(protect);

// Routes accessible by admin, agent, and staff
router
  .route("/")
  .get(authorize("admin", "agent", "staff"), getPassengers)
  .post(authorize("admin", "agent", "staff"), createPassenger);

router
  .route("/search/passport/:passportNumber")
  .get(authorize("admin", "agent", "staff"), searchByPassport);

router
  .route("/:id")
  .get(authorize("admin", "agent", "staff"), getPassenger)
  .put(authorize("admin", "agent", "staff"), updatePassenger)
  .delete(authorize("admin"), deletePassenger);

module.exports = router;
