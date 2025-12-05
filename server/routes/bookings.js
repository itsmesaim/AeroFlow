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

// Public routes - allow anyone to create booking and search by reference
router.post("/", createBooking);
router.get("/reference/:reference", getBookingByReference);

// Public routes for passengers to manage their bookings
router.route("/:id").get(getBooking).put(updateBooking).delete(deleteBooking);

// Protected routes (admin/staff only)
router.use(protect);

router.route("/").get(authorize("admin", "agent", "staff"), getBookings);

router
  .route("/:id/checkin")
  .put(authorize("admin", "agent", "staff"), checkInBooking);

router.route("/:id/board").put(authorize("admin", "agent"), boardBooking);

module.exports = router;
