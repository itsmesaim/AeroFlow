const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
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
      required: false,
    },
    class: {
      type: String,
      enum: ["economy", "business", "first"],
      required: true,
    },
    status: {
      type: String,
      enum: ["confirmed", "checked-in", "boarded", "cancelled"],
      default: "confirmed",
    },
    baggage: {
      type: [
        {
          weight: {
            type: Number,
            required: false,
          },
          type: {
            type: String,
            required: false,
          },
        },
      ],
      default: [],
    },
    checkInTime: {
      type: Date,
    },
    boardingTime: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Booking", BookingSchema);
