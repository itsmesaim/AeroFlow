const mongoose = require("mongoose");

const flightSchema = new mongoose.Schema({
  flightNumber: {
    type: String,
    required: [true, "Please add a flight number"],
    unique: true,
    uppercase: true,
    trim: true,
  },
  airline: {
    type: String,
    required: [true, "Please add an airline"],
    trim: true,
  },
  // Aircraft type from predefined list
  aircraft: {
    type: String,
    required: [true, "Please select an aircraft type"],
    enum: ["A320", "A330", "B737", "B777", "B787", "A380"],
  },
  origin: {
    type: String,
    required: [true, "Please add origin"],
    uppercase: true,
    trim: true,
  },
  destination: {
    type: String,
    required: [true, "Please add destination"],
    uppercase: true,
    trim: true,
  },
  departureTime: {
    type: Date,
    required: [true, "Please add departure time"],
  },
  arrivalTime: {
    type: Date,
    required: [true, "Please add arrival time"],
  },
  gate: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ["scheduled", "boarding", "departed", "delayed", "cancelled"],
    default: "scheduled",
  },
  // Auto-populated based on aircraft type
  capacity: {
    first: {
      type: Number,
      default: 0,
    },
    business: {
      type: Number,
      required: true,
    },
    economy: {
      type: Number,
      required: true,
    },
  },
  // UPDATED: Auto-populated with defaults, but can be customized
  price: {
    first: {
      type: Number,
      default: 0,
    },
    business: {
      type: Number,
      required: true,
    },
    economy: {
      type: Number,
      required: true,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Flight", flightSchema);
