// src/server.js
const { app, server, io } = require("./app");
const { pool } = require("./db/db");
require("dotenv").config();

// Import socket handlers
require("./sockets")(io);

const PORT = process.env.PORT || 5000;

// Start server
server.listen(PORT, async () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);

  // Test database connection
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Database connected:", result.rows[0].now);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
