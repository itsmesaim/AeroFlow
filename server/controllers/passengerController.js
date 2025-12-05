const Passenger = require("../models/Passenger");

// @desc    Get all passengers
// @route   GET /api/passengers
// @access  Private (Admin, Agent, Staff)
exports.getPassengers = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    // Build query
    let query = {};

    // Search by name, email, or passport
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { passportNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const passengers = await Passenger.find(query)
      .populate("userId", "name email")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Get total count
    const count = await Passenger.countDocuments(query);

    res.status(200).json({
      success: true,
      count: passengers.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      passengers,
    });
  } catch (error) {
    console.error("Error getting passengers:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Get single passenger
// @route   GET /api/passengers/:id
// @access  Private (Admin, Agent, Staff)
exports.getPassenger = async (req, res) => {
  try {
    const passenger = await Passenger.findById(req.params.id).populate(
      "userId",
      "name email"
    );

    if (!passenger) {
      return res.status(404).json({
        success: false,
        error: "Passenger not found",
      });
    }

    res.status(200).json({
      success: true,
      passenger,
    });
  } catch (error) {
    console.error("Error getting passenger:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Create new passenger
// @route   POST /api/passengers
// @access  Private (Admin, Agent, Staff)
exports.createPassenger = async (req, res) => {
  try {
    const { name, email, phone, passportNumber, dateOfBirth, nationality } =
      req.body;

    // Check if passenger with passport already exists
    const existingPassenger = await Passenger.findOne({ passportNumber });
    if (existingPassenger) {
      return res.status(400).json({
        success: false,
        error: "Passenger with this passport number already exists",
      });
    }

    // Create passenger
    const passenger = await Passenger.create({
      name,
      email,
      phone,
      passportNumber,
      dateOfBirth,
      nationality,
      userId: req.body.userId || null,
    });

    res.status(201).json({
      success: true,
      message: "Passenger created successfully",
      passenger,
    });
  } catch (error) {
    console.error("Error creating passenger:", error);

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

// @desc    Update passenger
// @route   PUT /api/passengers/:id
// @access  Private (Admin, Agent, Staff)
exports.updatePassenger = async (req, res) => {
  try {
    let passenger = await Passenger.findById(req.params.id);

    if (!passenger) {
      return res.status(404).json({
        success: false,
        error: "Passenger not found",
      });
    }

    // Check if updating passport number and if it already exists
    if (
      req.body.passportNumber &&
      req.body.passportNumber !== passenger.passportNumber
    ) {
      const existingPassenger = await Passenger.findOne({
        passportNumber: req.body.passportNumber,
      });
      if (existingPassenger) {
        return res.status(400).json({
          success: false,
          error: "Passenger with this passport number already exists",
        });
      }
    }

    // Update passenger
    passenger = await Passenger.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Passenger updated successfully",
      passenger,
    });
  } catch (error) {
    console.error("Error updating passenger:", error);

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

// @desc    Delete passenger
// @route   DELETE /api/passengers/:id
// @access  Private (Admin only)
exports.deletePassenger = async (req, res) => {
  try {
    const passenger = await Passenger.findById(req.params.id);

    if (!passenger) {
      return res.status(404).json({
        success: false,
        error: "Passenger not found",
      });
    }

    // Check if passenger has any bookings
    const Booking = require("../models/Booking");
    const bookings = await Booking.find({ passengerId: req.params.id });

    if (bookings.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete passenger with existing bookings",
      });
    }

    await passenger.deleteOne();

    res.status(200).json({
      success: true,
      message: "Passenger deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting passenger:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Search passengers by passport
// @route   GET /api/passengers/search/passport/:passportNumber
// @access  Private (Admin, Agent, Staff)
exports.searchByPassport = async (req, res) => {
  try {
    const passenger = await Passenger.findOne({
      passportNumber: req.params.passportNumber,
    }).populate("userId", "name email");

    if (!passenger) {
      return res.status(404).json({
        success: false,
        error: "Passenger not found",
      });
    }

    res.status(200).json({
      success: true,
      passenger,
    });
  } catch (error) {
    console.error("Error searching passenger:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};
