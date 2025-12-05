// Socket.io client configuration
const SOCKET_URL = "http://localhost:5000";
let socket = null;

// Initialize socket connection
function initSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });
  }
  return socket;
}

// Join flight room for updates
function joinFlightRoom(flightId) {
  if (!socket) initSocket();
  socket.emit("join-flight", flightId);
}

// Leave flight room
function leaveFlightRoom(flightId) {
  if (socket) {
    socket.emit("leave-flight", flightId);
  }
}

// Join boarding room (for staff)
function joinBoardingRoom(flightId) {
  if (!socket) initSocket();
  socket.emit("join-boarding", flightId);
}

// Listen for flight updates
function onFlightUpdate(callback) {
  if (!socket) initSocket();
  socket.on("flight-updated", callback);
}

// Listen for boarding updates
function onBoardingUpdate(callback) {
  if (!socket) initSocket();
  socket.on("boarding-updated", callback);
}

// Disconnect socket
function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
