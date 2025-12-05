const mongoose = require("mongoose");

const BoardingQueueSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
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
    boardingGroup: {
      type: String,
      enum: ["priority", "group-1", "group-2", "group-3", "general"],
      default: "general",
    },
    queuePosition: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["waiting", "called", "boarding", "boarded", "missed"],
      default: "waiting",
    },
    calledAt: {
      type: Date,
    },
    boardedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
BoardingQueueSchema.index({ flightId: 1, boardingGroup: 1, queuePosition: 1 });
BoardingQueueSchema.index({ bookingId: 1 });

module.exports = mongoose.model("BoardingQueue", BoardingQueueSchema);
