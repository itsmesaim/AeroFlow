const express = require("express");
const {
  getBoardingQueue,
  addToQueue,
  callPassenger,
  markBoarding,
  markBoarded,
  getBoardingStats,
  removeFromQueue,
} = require("../controllers/boardingController");

const router = express.Router();

const { protect, authorize } = require("../middleware/auth");

// All routes are protected
router.use(protect);

// Get boarding queue and stats for a flight - ALLOW STAFF
router.get(
  "/flight/:flightId",
  authorize("admin", "agent", "staff"),
  getBoardingQueue
);
router.get(
  "/flight/:flightId/stats",
  authorize("admin", "agent", "staff"),
  getBoardingStats
);

// Add to queue - ALLOW STAFF
router.post("/queue", authorize("admin", "agent", "staff"), addToQueue);

// Update queue entry - ALLOW STAFF for all operations
router.put("/:id/call", authorize("admin", "agent", "staff"), callPassenger);
router.put("/:id/boarding", authorize("admin", "agent", "staff"), markBoarding);
router.put("/:id/boarded", authorize("admin", "agent", "staff"), markBoarded);

// Remove from queue - ALLOW STAFF
router.delete("/:id", authorize("admin", "agent", "staff"), removeFromQueue);

module.exports = router;
