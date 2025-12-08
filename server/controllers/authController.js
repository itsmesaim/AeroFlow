const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      passportNumber,
      dateOfBirth,
      nationality,
      address,
    } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: "User already exists",
      });
    }

    // Check if passport exists (if provided)
    if (passportNumber) {
      const passportExists = await User.findOne({
        "profile.passportNumber": passportNumber,
      });
      if (passportExists) {
        return res.status(400).json({
          success: false,
          error: "Passport number already registered",
        });
      }
    }

    // Check profile completeness
    const isProfileComplete = !!(
      phone &&
      passportNumber &&
      dateOfBirth &&
      nationality
    );

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || "passenger",
      profile: {
        phone,
        passportNumber,
        dateOfBirth,
        nationality,
        address: address || {},
      },
      isProfileComplete,
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.profile.phone, // ← ADD THIS
        passportNumber: user.profile.passportNumber, // ← ADD THIS
        dateOfBirth: user.profile.dateOfBirth, // ← ADD THIS
        nationality: user.profile.nationality, // ← ADD THIS
        isProfileComplete: user.isProfileComplete,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide email and password",
      });
    }

    // Check for user (include password field)
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.profile?.phone, 
        passportNumber: user.profile?.passportNumber,
        dateOfBirth: user.profile?.dateOfBirth,
        nationality: user.profile?.nationality,
        isProfileComplete: user.isProfileComplete,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, passportNumber, dateOfBirth, nationality, address } =
      req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Check if passport is being changed and if it's already taken
    if (passportNumber && passportNumber !== user.profile.passportNumber) {
      const passportExists = await User.findOne({
        "profile.passportNumber": passportNumber,
        _id: { $ne: user._id },
      });
      if (passportExists) {
        return res.status(400).json({
          success: false,
          error: "Passport number already registered",
        });
      }
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.profile.phone = phone;
    if (passportNumber) user.profile.passportNumber = passportNumber;
    if (dateOfBirth) user.profile.dateOfBirth = dateOfBirth;
    if (nationality) user.profile.nationality = nationality;
    if (address) user.profile.address = { ...user.profile.address, ...address };

    // Check if profile is complete
    user.isProfileComplete = !!(
      user.profile.phone &&
      user.profile.passportNumber &&
      user.profile.dateOfBirth &&
      user.profile.nationality
    );

    await user.save();

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};
