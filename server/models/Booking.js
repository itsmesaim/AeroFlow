const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  bookingReference: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  flightId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Flight",
    required: true,
  },
  passengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Passenger",
    required: true,
  },
  seatNumber: {
    type: String,
    uppercase: true,
  },
  class: {
    type: String,
    enum: ["economy", "business"],
    required: true,
  },
  status: {
    type: String,
    enum: ["booked", "checked-in", "boarded", "cancelled"],
    default: "booked",
  },
  baggage: [
    {
      weight: {
        type: Number,
        required: true,
      },
      tag: {
        type: String,
        uppercase: true,
      },
      fee: {
        type: Number,
        default: 0,
      },
    },
  ],
  checkInTime: {
    type: Date,
  },
  boardingTime: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Generate booking reference before saving
bookingSchema.pre("save", function (next) {
  if (!this.bookingReference) {
    this.bookingReference = "BK" + Date.now().toString().slice(-8);
  }
  next();
});

module.exports = mongoose.model("Booking", bookingSchema);
