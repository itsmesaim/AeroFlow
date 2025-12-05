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

// Public routes - allow passengers to create and search
router.post("/", createPassenger);
router.get("/search/passport/:passportNumber", searchByPassport);

// Public routes for passengers to manage their info
router.route("/:id").get(getPassenger).put(updatePassenger);

// Protected routes (admin/staff only)
router.use(protect);

router.route("/").get(authorize("admin", "agent", "staff"), getPassengers);

router.route("/:id").delete(authorize("admin"), deletePassenger);

module.exports = router;
