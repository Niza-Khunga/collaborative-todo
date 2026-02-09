// server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const socketIo = require("socket.io");

// Load environment variables
dotenv.config();

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Create io instance
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Pass io to socket handlers
const todoSocket = require("./sockets/todoSocket");
// Initialize Socket.io handlers
todoSocket(io);

// Enable CORS for frontend
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/lists", require("./routes/lists"));
app.use("/api", require("./routes/todos")(io));

// Basic health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Routes placeholder (you'll add /auth, /lists, /todos later)
// Example:
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/lists', require('./routes/lists'));

// Graceful shutdown
process.on("SIGTERM", () => {
  server.close(() => {
    console.log("	Server shut down gracefully");
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
});
