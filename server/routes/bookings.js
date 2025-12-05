const express = require("express");
const {
  getBookings,
  getBooking,
  getBookingByReference,
  createBooking,
  updateBooking,
  deleteBooking,
  checkInBooking,
  boardBooking,
} = require("../controllers/bookingController");

const router = express.Router();

const { protect, authorize } = require("../middleware/auth");

// All routes are protected
router.use(protect);

// Routes accessible by admin, agent, and staff
router
  .route("/")
  .get(authorize("admin", "agent", "staff"), getBookings)
  .post(authorize("admin", "agent", "staff"), createBooking);

router
  .route("/reference/:reference")
  .get(authorize("admin", "agent", "staff"), getBookingByReference);

router
  .route("/:id")
  .get(authorize("admin", "agent", "staff"), getBooking)
  .put(authorize("admin", "agent", "staff"), updateBooking)
  .delete(authorize("admin", "agent"), deleteBooking);

router
  .route("/:id/checkin")
  .put(authorize("admin", "agent", "staff"), checkInBooking);

router.route("/:id/board").put(authorize("admin", "agent"), boardBooking);

module.exports = router;
