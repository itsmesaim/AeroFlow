const Flight = require("../models/Flight");
const Booking = require("../models/Booking");
const aircraftTypes = require("../config/aircraftTypes");
const emailService = require("../services/emailService");

// Helper function to emit socket events
const emitFlightUpdate = (req, flight, eventType) => {
  const io = req.app.get("io");
  if (io) {
    console.log(
      `Emitting flight update: ${eventType} for flight ${flight.flightNumber}`
    );
    io.emit("flight-updated", {
      type: eventType,
      flight: flight,
    });
  }
};

// Helper function to notify passengers about flight status changes
const notifyPassengers = async (flight, newStatus) => {
  try {
    // Only send emails for delayed, cancelled, and boarding statuses
    if (!["delayed", "cancelled", "boarding"].includes(newStatus)) {
      return;
    }

    const bookings = await Booking.find({
      flightId: flight._id,
      status: { $ne: "cancelled" },
    }).populate("passengerId");

    if (bookings.length === 0) {
      console.log("No passengers to notify for flight:", flight.flightNumber);
      return;
    }

    console.log(
      `📧 Notifying ${bookings.length} passengers about ${newStatus} status for flight ${flight.flightNumber}`
    );

    // Send emails to all passengers
    const emailPromises = bookings.map(async (booking) => {
      const emailData = {
        email: booking.passengerId.email,
        passengerName: booking.passengerId.name,
        bookingReference: booking.bookingReference,
        flightNumber: flight.flightNumber,
        origin: flight.origin,
        destination: flight.destination,
        gate: flight.gate || "TBA",
      };

      try {
        await emailService.sendFlightStatusUpdate(emailData, newStatus);
      } catch (err) {
        console.error(
          `Failed to send email to ${emailData.email}:`,
          err.message
        );
      }
    });

    await Promise.allSettled(emailPromises);
    console.log(`✅ Finished sending ${newStatus} notifications`);
  } catch (error) {
    console.error("Error notifying passengers:", error);
  }
};

// @desc    Get all flights
// @route   GET /api/flights
// @access  Public
exports.getFlights = async (req, res) => {
  try {
    const {
      status,
      destination,
      search,
      page = 1,
      limit = 10,
      sortBy = "departureTime",
      order = "asc",
    } = req.query;

    // Build query
    let query = {};

    if (status) {
      query.status = status;
    }

    if (destination) {
      query.destination = destination.toUpperCase();
    }

    if (search) {
      query.$or = [
        { flightNumber: { $regex: search, $options: "i" } },
        { destination: { $regex: search, $options: "i" } },
        { origin: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Sort
    const sortOrder = order === "desc" ? -1 : 1;
    const sort = { [sortBy]: sortOrder };

    // Execute query
    const flights = await Flight.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Flight.countDocuments(query);

    res.status(200).json({
      success: true,
      count: flights.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      flights,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single flight
// @route   GET /api/flights/:id
// @access  Public
exports.getFlight = async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id);

    if (!flight) {
      return res.status(404).json({ message: "Flight not found" });
    }

    res.status(200).json({
      success: true,
      flight,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create flight
// @route   POST /api/flights
// @access  Private/Admin
exports.createFlight = async (req, res) => {
  try {
    const { aircraft } = req.body;

    // Validate aircraft type
    const aircraftConfig = aircraftTypes[aircraft];

    if (!aircraftConfig) {
      return res.status(400).json({
        success: false,
        message: "Invalid aircraft type. Please select a valid aircraft.",
      });
    }

    // Auto-populate capacity from aircraft type
    const flightData = {
      ...req.body,
      capacity: {
        first: aircraftConfig.capacity.first,
        business: aircraftConfig.capacity.business,
        economy: aircraftConfig.capacity.economy,
      },
    };

    // Use provided prices or defaults from aircraft type
    if (!req.body.price || Object.keys(req.body.price).length === 0) {
      flightData.price = {
        first: aircraftConfig.defaultPrice.first,
        business: aircraftConfig.defaultPrice.business,
        economy: aircraftConfig.defaultPrice.economy,
      };
    } else {
      // Use provided prices, fill missing with defaults
      flightData.price = {
        first: req.body.price.first || aircraftConfig.defaultPrice.first,
        business:
          req.body.price.business || aircraftConfig.defaultPrice.business,
        economy: req.body.price.economy || aircraftConfig.defaultPrice.economy,
      };
    }

    const flight = await Flight.create(flightData);

    res.status(201).json({
      success: true,
      message: "Flight created successfully",
      flight,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Flight number already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update flight
// @route   PUT /api/flights/:id
// @access  Private/Admin
exports.updateFlight = async (req, res) => {
  try {
    let flight = await Flight.findById(req.params.id);

    if (!flight) {
      return res.status(404).json({
        success: false,
        error: "Flight not found",
      });
    }

    const oldStatus = flight.status;

    // If aircraft type is being changed, update capacity
    if (req.body.aircraft && req.body.aircraft !== flight.aircraft) {
      const aircraftConfig = aircraftTypes[req.body.aircraft];

      if (!aircraftConfig) {
        return res.status(400).json({
          success: false,
          error: "Invalid aircraft type",
        });
      }

      // Update capacity based on new aircraft type
      req.body.capacity = {
        first: aircraftConfig.capacity.first,
        business: aircraftConfig.capacity.business,
        economy: aircraftConfig.capacity.economy,
      };

      // Optionally update prices to new defaults (or keep existing)
      if (!req.body.price) {
        req.body.price = {
          first: req.body.price?.first || aircraftConfig.defaultPrice.first,
          business:
            req.body.price?.business || aircraftConfig.defaultPrice.business,
          economy:
            req.body.price?.economy || aircraftConfig.defaultPrice.economy,
        };
      }
    }

    // Update flight
    flight = await Flight.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Emit socket event for real-time update
    emitFlightUpdate(req, flight, "update");

    // If status changed, notify passengers
    if (req.body.status && req.body.status !== oldStatus) {
      notifyPassengers(flight, req.body.status).catch((err) => {
        console.error("Failed to notify passengers:", err);
      });
    }

    res.status(200).json({
      success: true,
      message: "Flight updated successfully",
      flight,
    });
  } catch (error) {
    console.error("Error updating flight:", error);

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

// @desc    Delete flight
// @route   DELETE /api/flights/:id
// @access  Private/Admin
exports.deleteFlight = async (req, res) => {
  try {
    const flight = await Flight.findByIdAndDelete(req.params.id);

    if (!flight) {
      return res.status(404).json({ message: "Flight not found" });
    }

    res.status(200).json({
      success: true,
      message: "Flight deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update flight status
// @route   PATCH /api/flights/:id/status
// @access  Private/Admin
exports.updateFlightStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const flight = await Flight.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!flight) {
      return res.status(404).json({ message: "Flight not found" });
    }

    // Emit socket event for status update
    emitFlightUpdate(req, flight, "status-change");

    // Notify passengers about status change
    notifyPassengers(flight, status).catch((err) => {
      console.error("Failed to notify passengers:", err);
    });

    res.status(200).json({
      success: true,
      message: "Flight status updated",
      flight,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
