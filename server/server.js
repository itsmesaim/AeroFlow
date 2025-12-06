const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const connectDB = require("./config/db");
const jwt = require("jsonwebtoken");

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const Booking = require("./models/Booking");
const Flight = require("./models/Flight");
const { protect } = require("./middleware/auth");
const aircraftTypes = require("./config/aircraftTypes");
const gateConfig = require("./config/gateConfig");

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Make io accessible to routes
app.set("io", io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

// AUTHENTICATION MIDDLEWARE
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// Socket.io connection
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Join flight-specific room
  socket.on("join-flight", (flightId) => {
    socket.join(`flight-${flightId}`);
    console.log(`Client ${socket.id} joined flight-${flightId}`);
  });

  // Leave flight room
  socket.on("leave-flight", (flightId) => {
    socket.leave(`flight-${flightId}`);
    console.log(`Client ${socket.id} left flight-${flightId}`);
  });

  // Join boarding room (for staff)
  socket.on("join-boarding", (flightId) => {
    socket.join(`boarding-${flightId}`);
    console.log(`Staff ${socket.id} joined boarding-${flightId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/flights", require("./routes/flights"));
app.use("/api/passengers", require("./routes/passengers"));
app.use("/api/bookings", require("./routes/bookings"));
app.use("/api/boarding", require("./routes/boarding"));

// Test route
app.get("/api", (req, res) => {
  res.json({
    message: "Airport Management System API",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        getMe: "GET /api/auth/me (Protected)",
      },
      flights: {
        getAll: "GET /api/flights",
        getOne: "GET /api/flights/:id",
        create: "POST /api/flights (Admin)",
        update: "PUT /api/flights/:id (Admin)",
        delete: "DELETE /api/flights/:id (Admin)",
      },
      passengers: {
        getAll: "GET /api/passengers (Admin/Agent/Staff)",
        getOne: "GET /api/passengers/:id",
        create: "POST /api/passengers",
        update: "PUT /api/passengers/:id",
        delete: "DELETE /api/passengers/:id (Admin)",
        searchByPassport: "GET /api/passengers/search/passport/:passportNumber",
      },
      bookings: {
        getAll: "GET /api/bookings (Admin/Agent/Staff)",
        getOne: "GET /api/bookings/:id",
        getByReference: "GET /api/bookings/reference/:reference",
        create: "POST /api/bookings",
        update: "PUT /api/bookings/:id",
        delete: "DELETE /api/bookings/:id",
        checkIn: "PUT /api/bookings/:id/checkin (Admin/Agent/Staff)",
        board: "PUT /api/bookings/:id/board (Admin/Agent)",
      },
      boarding: {
        getQueue: "GET /api/boarding/flight/:flightId (Admin/Agent)",
        getStats: "GET /api/boarding/flight/:flightId/stats (Admin/Agent)",
        addToQueue: "POST /api/boarding/queue (Admin/Agent/Staff)",
        callPassenger: "PUT /api/boarding/:id/call (Admin/Agent)",
        markBoarding: "PUT /api/boarding/:id/boarding (Admin/Agent)",
        markBoarded: "PUT /api/boarding/:id/boarded (Admin/Agent)",
        removeFromQueue: "DELETE /api/boarding/:id (Admin/Agent)",
      },
    },
  });
});

// ANALYTICS ENDPOINT
app.get("/api/analytics", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // KPIs
    const totalBookings = await Booking.countDocuments();

    // Calculate revenue based on booking class
    const bookingsWithFlights = await Booking.find({
      status: { $ne: "cancelled" },
    }).populate("flightId");

    const totalRevenue = bookingsWithFlights.reduce((sum, booking) => {
      if (!booking.flightId || !booking.flightId.price) return sum;

      // Check booking class (economy or business)
      const bookingClass = booking.class || "economy";
      const price = booking.flightId.price[bookingClass] || 0;

      return sum + price;
    }, 0);

    const bookingsToday = await Booking.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const flightsToday = await Flight.countDocuments({
      departureTime: { $gte: today, $lt: tomorrow },
    });

    // CHARTS
    const statusDistribution = await Flight.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const bookingsByDay = await Booking.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    //  Revenue by day with class-based pricing
    const revenueByDay = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: { $ne: "cancelled" },
        },
      },
      {
        $lookup: {
          from: "flights",
          localField: "flightId",
          foreignField: "_id",
          as: "flight",
        },
      },
      { $unwind: { path: "$flight", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          bookingPrice: {
            $cond: {
              if: { $eq: ["$class", "business"] },
              then: { $ifNull: ["$flight.price.business", 0] },
              else: { $ifNull: ["$flight.price.economy", 0] },
            },
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$bookingPrice" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const topRoutes = await Flight.aggregate([
      {
        $group: {
          _id: { origin: "$origin", destination: "$destination" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      kpis: {
        totalBookings,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        bookingsToday,
        flightsToday,
      },
      charts: {
        statusDistribution,
        bookingsByDay,
        revenueByDay,
        topRoutes,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});

app.get("/api/aircraft-types", (req, res) => {
  res.json({
    success: true,
    aircraftTypes: Object.keys(aircraftTypes).map((key) => ({
      code: key,
      name: aircraftTypes[key].name,
      capacity: aircraftTypes[key].capacity,
      defaultPrice: aircraftTypes[key].defaultPrice,
    })),
  });
});

// Get specific aircraft config
app.get("/api/aircraft-types/:type", (req, res) => {
  const aircraft = aircraftTypes[req.params.type];

  if (!aircraft) {
    return res.status(404).json({
      success: false,
      message: "Aircraft type not found",
    });
  }

  res.json({
    success: true,
    aircraft: {
      code: req.params.type,
      ...aircraft,
    },
  });
});

// Get all gates
app.get("/api/gates", (req, res) => {
  const gates = gateConfig.getAllGates();
  res.json({
    success: true,
    gates,
  });
});

// Get compatible gates for aircraft type
app.get("/api/gates/compatible/:aircraftType", (req, res) => {
  const { aircraftType } = req.params;
  const gates = gateConfig.getCompatibleGates(aircraftType);

  res.json({
    success: true,
    aircraftType,
    gates,
  });
});

// Get available gates (not assigned to active flights)
app.get("/api/gates/available", protect, async (req, res) => {
  try {
    const { aircraftType, dateTime } = req.query;

    // Get all gates
    let allGates = aircraftType
      ? gateConfig.getCompatibleGates(aircraftType)
      : gateConfig.getAllGates();

    // Find occupied gates for the given time window (±2 hours)
    const targetTime = dateTime ? new Date(dateTime) : new Date();
    const startTime = new Date(targetTime.getTime() - 2 * 60 * 60 * 1000); // 2 hours before
    const endTime = new Date(targetTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours after

    const occupiedFlights = await Flight.find({
      departureTime: { $gte: startTime, $lte: endTime },
      status: { $in: ["scheduled", "boarding", "delayed"] },
      gate: { $exists: true, $ne: "" },
    }).select("gate departureTime flightNumber");

    const occupiedGates = occupiedFlights.map((f) => f.gate);

    // Mark gates as available or occupied
    const gatesWithStatus = allGates.map((gateInfo) => ({
      ...gateInfo,
      available: !occupiedGates.includes(gateInfo.gate),
      occupiedBy: occupiedGates.includes(gateInfo.gate)
        ? occupiedFlights.find((f) => f.gate === gateInfo.gate)
        : null,
    }));

    res.json({
      success: true,
      gates: gatesWithStatus,
      timeWindow: { start: startTime, end: endTime },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
