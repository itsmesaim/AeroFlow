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

// Get boarding queue and stats for a flight
router.get("/flight/:flightId", authorize("admin", "agent"), getBoardingQueue);
router.get(
  "/flight/:flightId/stats",
  authorize("admin", "agent"),
  getBoardingStats
);

// Add to queue
router.post("/queue", authorize("admin", "agent", "staff"), addToQueue);

// Update queue entry
router.put("/:id/call", authorize("admin", "agent"), callPassenger);
router.put("/:id/boarding", authorize("admin", "agent"), markBoarding);
router.put("/:id/boarded", authorize("admin", "agent"), markBoarded);

// Remove from queue
router.delete("/:id", authorize("admin", "agent"), removeFromQueue);

module.exports = router;
