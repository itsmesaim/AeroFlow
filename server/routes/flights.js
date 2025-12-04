const express = require("express");
const {
  getFlights,
  getFlight,
  createFlight,
  updateFlight,
  deleteFlight,
  updateFlightStatus,
} = require("../controllers/flightController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.get("/", getFlights);
router.get("/:id", getFlight);

// Protected routes - Admin only
router.post("/", protect, authorize("admin"), createFlight);
router.put("/:id", protect, authorize("admin"), updateFlight);
router.delete("/:id", protect, authorize("admin"), deleteFlight);
router.patch(
  "/:id/status",
  protect,
  authorize("admin", "agent"),
  updateFlightStatus
);

module.exports = router;
