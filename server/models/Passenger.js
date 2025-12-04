const mongoose = require("mongoose");

const passengerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please add passenger name"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Please add email"],
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please add a valid email",
    ],
  },
  phone: {
    type: String,
    required: [true, "Please add phone number"],
  },
  passportNumber: {
    type: String,
    required: [true, "Please add passport number"],
    uppercase: true,
    unique: true,
  },
  dateOfBirth: {
    type: Date,
    required: [true, "Please add date of birth"],
  },
  nationality: {
    type: String,
    required: [true, "Please add nationality"],
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Passenger", passengerSchema);
