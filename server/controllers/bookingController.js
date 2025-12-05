const Booking = require("../models/Booking");
const Flight = require("../models/Flight");
const Passenger = require("../models/Passenger");

// Generate unique booking reference
const generateBookingReference = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let reference = "";
  for (let i = 0; i < 6; i++) {
    reference += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return reference;
};

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private (Admin, Agent, Staff)
exports.getBookings = async (req, res) => {
  try {
    const { search, status, flightId, page = 1, limit = 10 } = req.query;

    // Build query
    let query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by flight
    if (flightId) {
      query.flightId = flightId;
    }

    // Search by booking reference
    if (search) {
      query.bookingReference = { $regex: search, $options: "i" };
    }

    // Execute query with pagination
    const bookings = await Booking.find(query)
      .populate("flightId", "flightNumber origin destination departureTime")
      .populate("passengerId", "name email passportNumber")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Get total count
    const count = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      bookings,
    });
  } catch (error) {
    console.error("Error getting bookings:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private (Admin, Agent, Staff)
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("flightId")
      .populate("passengerId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Error getting booking:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Get booking by reference
// @route   GET /api/bookings/reference/:reference
// @access  Private (Admin, Agent, Staff)
exports.getBookingByReference = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      bookingReference: req.params.reference,
    })
      .populate("flightId")
      .populate("passengerId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Error getting booking:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private (Admin, Agent, Staff)
exports.createBooking = async (req, res) => {
  try {
    const {
      flightId,
      passengerId,
      seatNumber,
      class: seatClass,
      baggage,
    } = req.body;

    // Verify flight exists
    const flight = await Flight.findById(flightId);
    if (!flight) {
      return res.status(404).json({
        success: false,
        error: "Flight not found",
      });
    }

    // Verify passenger exists
    const passenger = await Passenger.findById(passengerId);
    if (!passenger) {
      return res.status(404).json({
        success: false,
        error: "Passenger not found",
      });
    }

    // Check if seat is already taken
    if (seatNumber) {
      const existingSeat = await Booking.findOne({
        flightId,
        seatNumber,
        status: { $in: ["confirmed", "checked-in", "boarded"] },
      });

      if (existingSeat) {
        return res.status(400).json({
          success: false,
          error: "Seat already taken",
        });
      }
    }

    // Check flight capacity
    const bookingsCount = await Booking.countDocuments({
      flightId,
      status: { $in: ["confirmed", "checked-in", "boarded"] },
    });

    const totalCapacity = flight.capacity.economy + flight.capacity.business;
    if (bookingsCount >= totalCapacity) {
      return res.status(400).json({
        success: false,
        error: "Flight is full",
      });
    }

    // Generate booking reference
    let bookingReference;
    let isUnique = false;
    while (!isUnique) {
      bookingReference = generateBookingReference();
      const existing = await Booking.findOne({ bookingReference });
      if (!existing) {
        isUnique = true;
      }
    }

    // Create booking
    const booking = await Booking.create({
      bookingReference,
      flightId,
      passengerId,
      seatNumber,
      class: seatClass,
      status: "confirmed",
      baggage: baggage || [],
    });

    // Populate before sending response
    await booking.populate(
      "flightId",
      "flightNumber origin destination departureTime"
    );
    await booking.populate("passengerId", "name email passportNumber");

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.error("Error creating booking:", error);

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

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private (Admin, Agent, Staff)
exports.updateBooking = async (req, res) => {
  try {
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found",
      });
    }

    // If updating seat, check availability
    if (req.body.seatNumber && req.body.seatNumber !== booking.seatNumber) {
      const existingSeat = await Booking.findOne({
        flightId: booking.flightId,
        seatNumber: req.body.seatNumber,
        status: { $in: ["confirmed", "checked-in", "boarded"] },
        _id: { $ne: req.params.id },
      });

      if (existingSeat) {
        return res.status(400).json({
          success: false,
          error: "Seat already taken",
        });
      }
    }

    // Update booking
    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("flightId", "flightNumber origin destination departureTime")
      .populate("passengerId", "name email passportNumber");

    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      booking,
    });
  } catch (error) {
    console.error("Error updating booking:", error);

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

// @desc    Delete booking (Cancel)
// @route   DELETE /api/bookings/:id
// @access  Private (Admin, Agent)
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found",
      });
    }

    // Check if already boarded
    if (booking.status === "boarded") {
      return res.status(400).json({
        success: false,
        error: "Cannot cancel a booking that has already boarded",
      });
    }

    await booking.deleteOne();

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Check-in booking
// @route   PUT /api/bookings/:id/checkin
// @access  Private (Admin, Agent, Staff)
exports.checkInBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found",
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        error: "Cannot check-in a cancelled booking",
      });
    }

    if (booking.status === "checked-in" || booking.status === "boarded") {
      return res.status(400).json({
        success: false,
        error: "Booking already checked-in",
      });
    }

    booking.status = "checked-in";
    booking.checkInTime = new Date();
    await booking.save();

    await booking.populate(
      "flightId",
      "flightNumber origin destination departureTime gate"
    );
    await booking.populate("passengerId", "name email passportNumber");

    res.status(200).json({
      success: true,
      message: "Check-in successful",
      booking,
    });
  } catch (error) {
    console.error("Error checking in booking:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Board booking
// @route   PUT /api/bookings/:id/board
// @access  Private (Admin, Agent)
exports.boardBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found",
      });
    }

    if (booking.status !== "checked-in") {
      return res.status(400).json({
        success: false,
        error: "Passenger must check-in first",
      });
    }

    booking.status = "boarded";
    booking.boardingTime = new Date();
    await booking.save();

    await booking.populate(
      "flightId",
      "flightNumber origin destination departureTime gate"
    );
    await booking.populate("passengerId", "name email passportNumber");

    res.status(200).json({
      success: true,
      message: "Boarding successful",
      booking,
    });
  } catch (error) {
    console.error("Error boarding booking:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};
