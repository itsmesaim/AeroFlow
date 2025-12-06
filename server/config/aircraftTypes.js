const aircraftTypes = {
  A320: {
    name: "Airbus A320",
    capacity: {
      first: 0,
      business: 20,
      economy: 150,
    },
    defaultPrice: {
      first: 0,
      business: 600,
      economy: 200,
    },
    seatLayout: {
      first: { rows: 0, columns: [] },
      business: { rows: [1, 5], columns: ["A", "B", "C", "D"] }, // Rows 1-5, 2-2 config
      economy: { rows: [6, 30], columns: ["A", "B", "C", "D", "E", "F"] }, // Rows 6-30, 3-3 config
    },
  },
  A330: {
    name: "Airbus A330",
    capacity: {
      first: 8,
      business: 36,
      economy: 200,
    },
    defaultPrice: {
      first: 1500,
      business: 800,
      economy: 300,
    },
    seatLayout: {
      first: { rows: [1, 2], columns: ["A", "B", "C", "D"] }, // Rows 1-2, 2-2 config
      business: { rows: [3, 11], columns: ["A", "B", "C", "D"] }, // Rows 3-11, 2-2 config
      economy: { rows: [12, 45], columns: ["A", "B", "C", "D", "E", "F", "G"] }, // Rows 12-45, 2-3-2 config
    },
  },
  B737: {
    name: "Boeing 737",
    capacity: {
      first: 0,
      business: 16,
      economy: 126,
    },
    defaultPrice: {
      first: 0,
      business: 550,
      economy: 180,
    },
    seatLayout: {
      first: { rows: 0, columns: [] },
      business: { rows: [1, 4], columns: ["A", "B", "C", "D"] },
      economy: { rows: [5, 25], columns: ["A", "B", "C", "D", "E", "F"] },
    },
  },
  B777: {
    name: "Boeing 777",
    capacity: {
      first: 8,
      business: 40,
      economy: 264,
    },
    defaultPrice: {
      first: 2000,
      business: 1000,
      economy: 400,
    },
    seatLayout: {
      first: { rows: [1, 2], columns: ["A", "B", "C", "D"] },
      business: { rows: [3, 12], columns: ["A", "B", "C", "D"] },
      economy: {
        rows: [13, 50],
        columns: ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"],
      },
    },
  },
  B787: {
    name: "Boeing 787 Dreamliner",
    capacity: {
      first: 0,
      business: 28,
      economy: 224,
    },
    defaultPrice: {
      first: 0,
      business: 900,
      economy: 350,
    },
    seatLayout: {
      first: { rows: 0, columns: [] },
      business: { rows: [1, 7], columns: ["A", "B", "C", "D"] },
      economy: {
        rows: [8, 35],
        columns: ["A", "B", "C", "D", "E", "F", "G", "H", "J"],
      },
    },
  },
  A380: {
    name: "Airbus A380",
    capacity: {
      first: 14,
      business: 76,
      economy: 429,
    },
    defaultPrice: {
      first: 3000,
      business: 1500,
      economy: 500,
    },
    seatLayout: {
      first: { rows: [1, 2], columns: ["A", "B", "E", "F", "J", "K"] }, // Upper deck
      business: { rows: [3, 21], columns: ["A", "B", "D", "E", "G", "H"] },
      economy: {
        rows: [22, 65],
        columns: ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"],
      },
    },
  },
};

module.exports = aircraftTypes;
