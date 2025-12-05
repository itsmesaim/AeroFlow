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
  aircraft: {
    type: String,
    trim: true,
  },
  capacity: {
    economy: { type: Number, default: 150 },
    business: { type: Number, default: 20 },
    first: { type: Number, default: 8 },
  },
  price: {
    economy: { type: Number, required: true },
    business: { type: Number, required: true },
    first: { type: Number, required: true },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Flight", flightSchema);
