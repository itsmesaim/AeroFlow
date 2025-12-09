const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Flight = require("./models/Flight");
const User = require("./models/User");
const Passenger = require("./models/Passenger");
const Booking = require("./models/Booking");
const BoardingQueue = require("./models/BoardingQueue");

// Load env vars
dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log(" MongoDB Connected for seeding"))
  .catch((err) => {
    console.error(" MongoDB connection error:", err);
    process.exit(1);
  });

// New users to add
const newUsers = [
  {
    name: "Alice Cooper",
    email: "alice@example.com",
    password: "pass123",
    role: "passenger",
    profile: {
      phone: "+1555111222",
      passportNumber: "A1234567",
      dateOfBirth: "1992-03-15",
      nationality: "United States",
    },
    isProfileComplete: true,
  },
  {
    name: "Bob Smith",
    email: "bob@example.com",
    password: "pass123",
    role: "passenger",
    profile: {
      phone: "+1555222333",
      passportNumber: "B7654321",
      dateOfBirth: "1988-07-22",
      nationality: "Canada",
    },
    isProfileComplete: true,
  },
  {
    name: "Charlie Brown",
    email: "charlie@example.com",
    password: "pass123",
    role: "passenger",
    profile: {
      phone: "+1555333444",
      passportNumber: "C9876543",
      dateOfBirth: "1995-11-08",
      nationality: "United Kingdom",
    },
    isProfileComplete: true,
  },
  {
    name: "Diana Prince",
    email: "diana@example.com",
    password: "pass123",
    role: "passenger",
    profile: {
      phone: "+1555444555",
      passportNumber: "D1357924",
      dateOfBirth: "1990-01-30",
      nationality: "Australia",
    },
    isProfileComplete: true,
  },
];

// New flights to add
const newFlights = [
  {
    flightNumber: "LH700",
    airline: "Lufthansa",
    aircraft: "A350",
    origin: "FRA",
    destination: "JFK",
    departureTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
    arrivalTime: new Date(Date.now() + 17 * 60 * 60 * 1000),
    gate: "F12",
    status: "scheduled",
    capacity: {
      economy: 180,
      business: 40,
      first: 15,
    },
    price: {
      economy: 450,
      business: 1200,
      first: 2500,
    },
  },
  {
    flightNumber: "AF200",
    airline: "Air France",
    aircraft: "B777",
    origin: "CDG",
    destination: "LAX",
    departureTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
    arrivalTime: new Date(Date.now() + 15 * 60 * 60 * 1000),
    gate: "G8",
    status: "scheduled",
    capacity: {
      economy: 200,
      business: 50,
      first: 20,
    },
    price: {
      economy: 500,
      business: 1400,
      first: 2800,
    },
  },
  {
    flightNumber: "QF1",
    airline: "Qantas",
    aircraft: "A380",
    origin: "SYD",
    destination: "DXB",
    departureTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
    arrivalTime: new Date(Date.now() + 20 * 60 * 60 * 1000),
    gate: "H5",
    status: "scheduled",
    capacity: {
      economy: 250,
      business: 60,
      first: 25,
    },
    price: {
      economy: 600,
      business: 1800,
      first: 3500,
    },
  },
];

// New passengers
const newPassengers = [
  {
    name: "Eva Martinez",
    email: "eva@example.com",
    phone: "+1555666777",
    passportNumber: "E2468135",
    dateOfBirth: "1987-05-12",
    nationality: "Spain",
  },
  {
    name: "Frank Wilson",
    email: "frank@example.com",
    phone: "+1555777888",
    passportNumber: "F1357924",
    dateOfBirth: "1993-09-25",
    nationality: "Ireland",
  },
  {
    name: "Grace Lee",
    email: "grace@example.com",
    phone: "+1555888999",
    passportNumber: "G9876543",
    dateOfBirth: "1991-12-03",
    nationality: "Singapore",
  },
  {
    name: "Henry Taylor",
    email: "henry@example.com",
    phone: "+1555999000",
    passportNumber: "H2468135",
    dateOfBirth: "1989-04-17",
    nationality: "New Zealand",
  },
  {
    name: "Iris Johnson",
    email: "iris@example.com",
    phone: "+1555000111",
    passportNumber: "I3579246",
    dateOfBirth: "1994-08-22",
    nationality: "Sweden",
  },
  {
    name: "Jack Brown",
    email: "jack@example.com",
    phone: "+1555111000",
    passportNumber: "J4682357",
    dateOfBirth: "1986-02-14",
    nationality: "Denmark",
  },
];

const generateBookingReference = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let reference = "";
  for (let i = 0; i < 6; i++) {
    reference += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return reference;
};

const seedDatabase = async () => {
  try {
    console.log(" Adding new data (keeping existing data)...");

    // Check for duplicate users
    console.log("👥 Creating new users...");
    const createdUsers = [];
    for (const user of newUsers) {
      const existing = await User.findOne({ email: user.email });
      if (!existing) {
        const newUser = await User.create(user);
        createdUsers.push(newUser);
      } else {
        console.log(`     User ${user.email} already exists, skipping...`);
      }
    }
    console.log(` Created ${createdUsers.length} new users`);

    // Check for duplicate flights
    console.log("  Creating new flights...");
    const createdFlights = [];
    for (const flight of newFlights) {
      const existing = await Flight.findOne({
        flightNumber: flight.flightNumber,
      });
      if (!existing) {
        const newFlight = await Flight.create(flight);
        createdFlights.push(newFlight);
      } else {
        console.log(
          `     Flight ${flight.flightNumber} already exists, skipping...`
        );
      }
    }
    console.log(` Created ${createdFlights.length} new flights`);

    // Check for duplicate passengers
    console.log(" Creating new passengers...");
    const createdPassengers = [];
    for (const passenger of newPassengers) {
      const existing = await Passenger.findOne({
        passportNumber: passenger.passportNumber,
      });
      if (!existing) {
        const newPassenger = await Passenger.create(passenger);
        createdPassengers.push(newPassenger);
      } else {
        console.log(
          `     Passenger ${passenger.passportNumber} already exists, skipping...`
        );
      }
    }
    console.log(` Created ${createdPassengers.length} new passengers`);

    // Create bookings only if we have new flights and passengers
    if (createdFlights.length === 0) {
      console.log("  No new flights created, skipping bookings...");
      console.log("\n SEEDING COMPLETE!");
      console.log("================================");
      console.log(` New Users: ${createdUsers.length}`);
      console.log(`  New Flights: ${createdFlights.length}`);
      console.log(` New Passengers: ${createdPassengers.length}`);
      console.log(` New Bookings: 0`);
      process.exit(0);
      return;
    }

    console.log("🎫 Creating new bookings...");
    const bookings = [];

    // Flight LH700 (scheduled) - Multiple bookings from different passengers
    // Family booking - 3 tickets
    bookings.push({
      bookingReference: generateBookingReference(),
      flightId: createdFlights[0]._id, // LH700
      passengerId: createdPassengers[0]._id,
      seatNumber: "20A",
      class: "economy",
      status: "confirmed",
      baggage: [{ weight: 23, type: "checked" }],
    });

    bookings.push({
      bookingReference: generateBookingReference(),
      flightId: createdFlights[0]._id,
      passengerId: createdPassengers[1]._id,
      seatNumber: "20B",
      class: "economy",
      status: "confirmed",
      baggage: [{ weight: 20, type: "checked" }],
    });

    bookings.push({
      bookingReference: generateBookingReference(),
      flightId: createdFlights[0]._id,
      passengerId: createdPassengers[2]._id,
      seatNumber: "20C",
      class: "economy",
      status: "confirmed",
      baggage: [{ weight: 18, type: "checked" }],
    });

    // Business travelers on LH700
    bookings.push({
      bookingReference: generateBookingReference(),
      flightId: createdFlights[0]._id,
      passengerId: createdPassengers[3]._id,
      seatNumber: "5A",
      class: "business",
      status: "checked-in",
      checkInTime: new Date(),
      baggage: [{ weight: 25, type: "checked" }],
    });

    bookings.push({
      bookingReference: generateBookingReference(),
      flightId: createdFlights[0]._id,
      passengerId: createdPassengers[4]._id,
      seatNumber: "5B",
      class: "business",
      status: "confirmed",
      baggage: [{ weight: 22, type: "checked" }],
    });

    // Flight AF200 (scheduled) - Group booking of 4 passengers
    bookings.push({
      bookingReference: generateBookingReference(),
      flightId: createdFlights[1]._id, // AF200
      passengerId: createdPassengers[0]._id,
      seatNumber: "25D",
      class: "economy",
      status: "confirmed",
      baggage: [{ weight: 23, type: "checked" }],
    });

    bookings.push({
      bookingReference: generateBookingReference(),
      flightId: createdFlights[1]._id,
      passengerId: createdPassengers[1]._id,
      seatNumber: "25E",
      class: "economy",
      status: "confirmed",
      baggage: [{ weight: 20, type: "checked" }],
    });

    bookings.push({
      bookingReference: generateBookingReference(),
      flightId: createdFlights[1]._id,
      passengerId: createdPassengers[2]._id,
      seatNumber: "25F",
      class: "economy",
      status: "confirmed",
      baggage: [{ weight: 19, type: "checked" }],
    });

    bookings.push({
      bookingReference: generateBookingReference(),
      flightId: createdFlights[1]._id,
      passengerId: createdPassengers[3]._id,
      seatNumber: "26D",
      class: "economy",
      status: "checked-in",
      checkInTime: new Date(),
      baggage: [{ weight: 21, type: "checked" }],
    });

    // Flight QF1 (scheduled) - Mix of classes, 5 bookings
    bookings.push({
      bookingReference: generateBookingReference(),
      flightId: createdFlights[2]._id, // QF1
      passengerId: createdPassengers[4]._id,
      seatNumber: "1A",
      class: "first",
      status: "confirmed",
      baggage: [{ weight: 30, type: "checked" }],
    });

    bookings.push({
      bookingReference: generateBookingReference(),
      flightId: createdFlights[2]._id,
      passengerId: createdPassengers[5]._id,
      seatNumber: "8C",
      class: "business",
      status: "confirmed",
      baggage: [{ weight: 25, type: "checked" }],
    });

    bookings.push({
      bookingReference: generateBookingReference(),
      flightId: createdFlights[2]._id,
      passengerId: createdPassengers[0]._id,
      seatNumber: "30A",
      class: "economy",
      status: "checked-in",
      checkInTime: new Date(),
      baggage: [{ weight: 23, type: "checked" }],
    });

    bookings.push({
      bookingReference: generateBookingReference(),
      flightId: createdFlights[2]._id,
      passengerId: createdPassengers[1]._id,
      seatNumber: "30B",
      class: "economy",
      status: "confirmed",
      baggage: [{ weight: 20, type: "checked" }],
    });

    bookings.push({
      bookingReference: generateBookingReference(),
      flightId: createdFlights[2]._id,
      passengerId: createdPassengers[2]._id,
      seatNumber: "30C",
      class: "economy",
      status: "confirmed",
      baggage: [{ weight: 22, type: "checked" }],
    });

    const createdBookings = await Booking.create(bookings);
    console.log(` Created ${createdBookings.length} new bookings`);

    // Print summary
    console.log("\n NEW DATA ADDED SUCCESSFULLY!");
    console.log("================================");
    console.log(`👥 New Users: ${createdUsers.length}`);
    createdUsers.forEach((u) => {
      console.log(`   - ${u.email} / pass123 (${u.role})`);
    });

    console.log(`\n  New Flights: ${createdFlights.length}`);
    createdFlights.forEach((f) => {
      console.log(
        `   - ${f.flightNumber}: ${f.origin} → ${f.destination} (${f.status})`
      );
    });

    console.log(`\n New Passengers: ${createdPassengers.length}`);

    console.log(`\n New Bookings: ${createdBookings.length}`);
    console.log(
      `   - ${
        createdBookings.filter((b) => b.status === "confirmed").length
      } confirmed (ready for check-in)`
    );
    console.log(
      `   - ${
        createdBookings.filter((b) => b.status === "checked-in").length
      } checked-in`
    );

    console.log("\n NEW BOOKING REFERENCES:");
    createdBookings.forEach((b, i) => {
      const flight = createdFlights.find(
        (f) => f._id.toString() === b.flightId.toString()
      );
      const passenger = createdPassengers.find(
        (p) => p._id.toString() === b.passengerId.toString()
      );
      console.log(
        `   ${i + 1}. ${b.bookingReference} - ${flight.flightNumber} - ${
          passenger.name
        } - ${b.class} - ${b.status}`
      );
    });

    console.log("\n USAGE:");
    console.log("   - Login as staff: staff@aeroflow.com / staff123");
    console.log("   - Go to check-in page");
    console.log("   - Search for any booking reference above");
    console.log("   - Check in passengers and test the full flow!");

    console.log("\n================================");
    console.log(" Existing data preserved + New data added!");

    process.exit(0);
  } catch (error) {
    console.error(" Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
