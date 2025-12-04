const Flight = require("../models/Flight");

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
    const flight = await Flight.create(req.body);

    res.status(201).json({
      success: true,
      message: "Flight created successfully",
      flight,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Flight number already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update flight
// @route   PUT /api/flights/:id
// @access  Private/Admin
exports.updateFlight = async (req, res) => {
  try {
    const flight = await Flight.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!flight) {
      return res.status(404).json({ message: "Flight not found" });
    }

    res.status(200).json({
      success: true,
      message: "Flight updated successfully",
      flight,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    res.status(200).json({
      success: true,
      message: "Flight status updated",
      flight,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
