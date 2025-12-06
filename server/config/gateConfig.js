const gateConfig = {
  terminals: {
    A: {
      name: "Terminal A - Domestic",
      gates: [
        "A1",
        "A2",
        "A3",
        "A4",
        "A5",
        "A6",
        "A7",
        "A8",
        "A9",
        "A10",
        "A11",
        "A12",
      ],
      types: ["narrow-body", "regional"],
    },
    B: {
      name: "Terminal B - International",
      gates: ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10"],
      types: ["wide-body", "narrow-body"],
    },
    C: {
      name: "Terminal C - International Wide-body",
      gates: ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"],
      types: ["wide-body"],
    },
    D: {
      name: "Terminal D - Regional",
      gates: ["D1", "D2", "D3", "D4", "D5", "D6"],
      types: ["regional", "narrow-body"],
    },
  },

  aircraftGateMapping: {
    A320: "narrow-body",
    A330: "wide-body",
    B737: "narrow-body",
    B777: "wide-body",
    B787: "wide-body",
    A380: "wide-body",
  },

  getAllGates() {
    const gates = [];
    Object.keys(this.terminals).forEach((terminalCode) => {
      this.terminals[terminalCode].gates.forEach((gate) => {
        gates.push({
          gate: gate,
          terminal: terminalCode,
          terminalName: this.terminals[terminalCode].name,
          types: this.terminals[terminalCode].types,
        });
      });
    });
    return gates;
  },

  getCompatibleGates(aircraftType) {
    const aircraftCategory = this.aircraftGateMapping[aircraftType];
    if (!aircraftCategory) return this.getAllGates();

    const compatibleGates = [];
    Object.keys(this.terminals).forEach((terminalCode) => {
      const terminal = this.terminals[terminalCode];
      if (terminal.types.includes(aircraftCategory)) {
        terminal.gates.forEach((gate) => {
          compatibleGates.push({
            gate: gate,
            terminal: terminalCode,
            terminalName: terminal.name,
            types: terminal.types,
          });
        });
      }
    });
    return compatibleGates;
  },
};

module.exports = gateConfig;
