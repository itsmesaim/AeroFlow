const BoardingQueue = require("../models/BoardingQueue");
const Booking = require("../models/Booking");
const Flight = require("../models/Flight");

// @desc    Get boarding queue for a flight
// @route   GET /api/boarding/flight/:flightId
// @access  Private (Admin, Agent)
exports.getBoardingQueue = async (req, res) => {
  try {
    const queue = await BoardingQueue.find({
      flightId: req.params.flightId,
    })
      .populate("bookingId", "bookingReference seatNumber class")
      .populate("passengerId", "name passportNumber")
      .sort({ boardingGroup: 1, queuePosition: 1 });

    res.status(200).json({
      success: true,
      count: queue.length,
      queue,
    });
  } catch (error) {
    console.error("Error getting boarding queue:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Add passenger to boarding queue
// @route   POST /api/boarding/queue
// @access  Private (Admin, Agent, Staff)
exports.addToQueue = async (req, res) => {
  try {
    const { bookingId, boardingGroup } = req.body;

    // Get booking details
    const booking = await Booking.findById(bookingId)
      .populate("flightId")
      .populate("passengerId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found",
      });
    }

    // Check if already in queue
    const existingQueue = await BoardingQueue.findOne({ bookingId });
    if (existingQueue) {
      return res.status(400).json({
        success: false,
        error: "Passenger already in boarding queue",
      });
    }

    // Check if checked in
    if (booking.status !== "checked-in" && booking.status !== "boarded") {
      return res.status(400).json({
        success: false,
        error: "Passenger must check-in first",
      });
    }

    // Determine boarding group if not provided
    let group = boardingGroup;
    if (!group) {
      group = booking.class === "business" ? "group-1" : "group-2";
    }

    // Get next queue position for this group
    const lastInGroup = await BoardingQueue.findOne({
      flightId: booking.flightId._id,
      boardingGroup: group,
    }).sort({ queuePosition: -1 });

    const queuePosition = lastInGroup ? lastInGroup.queuePosition + 1 : 1;

    // Create queue entry
    const queueEntry = await BoardingQueue.create({
      bookingId: booking._id,
      flightId: booking.flightId._id,
      passengerId: booking.passengerId._id,
      boardingGroup: group,
      queuePosition,
      status: "waiting",
    });

    // Populate before sending
    await queueEntry.populate("bookingId", "bookingReference seatNumber class");
    await queueEntry.populate("passengerId", "name passportNumber");

    res.status(201).json({
      success: true,
      message: "Added to boarding queue",
      queueEntry,
    });
  } catch (error) {
    console.error("Error adding to queue:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        error: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Call passenger for boarding
// @route   PUT /api/boarding/:id/call
// @access  Private (Admin, Agent)
exports.callPassenger = async (req, res) => {
  try {
    const queueEntry = await BoardingQueue.findById(req.params.id);

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        error: "Queue entry not found",
      });
    }

    queueEntry.status = "called";
    queueEntry.calledAt = new Date();
    await queueEntry.save();

    await queueEntry.populate("bookingId", "bookingReference seatNumber class");
    await queueEntry.populate("passengerId", "name passportNumber");

    res.status(200).json({
      success: true,
      message: "Passenger called for boarding",
      queueEntry,
    });
  } catch (error) {
    console.error("Error calling passenger:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Mark passenger as boarding
// @route   PUT /api/boarding/:id/boarding
// @access  Private (Admin, Agent)
exports.markBoarding = async (req, res) => {
  try {
    const queueEntry = await BoardingQueue.findById(req.params.id);

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        error: "Queue entry not found",
      });
    }

    queueEntry.status = "boarding";
    await queueEntry.save();

    await queueEntry.populate("bookingId", "bookingReference seatNumber class");
    await queueEntry.populate("passengerId", "name passportNumber");

    res.status(200).json({
      success: true,
      message: "Passenger is boarding",
      queueEntry,
    });
  } catch (error) {
    console.error("Error marking boarding:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Mark passenger as boarded
// @route   PUT /api/boarding/:id/boarded
// @access  Private (Admin, Agent)
exports.markBoarded = async (req, res) => {
  try {
    const queueEntry = await BoardingQueue.findById(req.params.id);

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        error: "Queue entry not found",
      });
    }

    // Update queue entry
    queueEntry.status = "boarded";
    queueEntry.boardedAt = new Date();
    await queueEntry.save();

    // Update booking status
    await Booking.findByIdAndUpdate(queueEntry.bookingId, {
      status: "boarded",
      boardingTime: new Date(),
    });

    await queueEntry.populate("bookingId", "bookingReference seatNumber class");
    await queueEntry.populate("passengerId", "name passportNumber");

    res.status(200).json({
      success: true,
      message: "Passenger boarded successfully",
      queueEntry,
    });
  } catch (error) {
    console.error("Error marking boarded:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Get boarding statistics for a flight
// @route   GET /api/boarding/flight/:flightId/stats
// @access  Private (Admin, Agent)
exports.getBoardingStats = async (req, res) => {
  try {
    const flightId = req.params.flightId;

    const stats = await BoardingQueue.aggregate([
      { $match: { flightId: mongoose.Types.ObjectId(flightId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalBookings = await Booking.countDocuments({
      flightId,
      status: { $in: ["checked-in", "boarded"] },
    });

    const result = {
      total: totalBookings,
      waiting: 0,
      called: 0,
      boarding: 0,
      boarded: 0,
      missed: 0,
    };

    stats.forEach((stat) => {
      result[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      stats: result,
    });
  } catch (error) {
    console.error("Error getting boarding stats:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Remove from boarding queue
// @route   DELETE /api/boarding/:id
// @access  Private (Admin, Agent)
exports.removeFromQueue = async (req, res) => {
  try {
    const queueEntry = await BoardingQueue.findById(req.params.id);

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        error: "Queue entry not found",
      });
    }

    await queueEntry.deleteOne();

    res.status(200).json({
      success: true,
      message: "Removed from boarding queue",
    });
  } catch (error) {
    console.error("Error removing from queue:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};
