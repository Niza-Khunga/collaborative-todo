// tests/helpers/testHelpers.js
const jwt = require("jsonwebtoken");

// Generate test token
const generateTestToken = (userId = 1, email = "test@example.com") => {
  return jwt.sign({ id: userId, email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

// Mock Socket.io for testing
const createMockSocket = () => ({
  id: `test-socket-${Math.random()}`,
  join: jest.fn(),
  leave: jest.fn(),
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
  rooms: new Set(),
});

// Clean database between tests
const cleanDatabase = async (pool) => {
  const tables = ["todos", "list_collaborators", "todo_lists", "users"];
  for (const table of tables) {
    await pool.query(`TRUNCATE ${table} CASCADE`);
  }
};

module.exports = { generateTestToken, createMockSocket, cleanDatabase };
