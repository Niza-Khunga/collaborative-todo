// backend/jest.config.js
module.exports = {
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.js", "!src/**/*.test.js"],
  testMatch: ["**/*.test.js"],
  setupFilesAfterEnv: ["./tests/setup.js"],
};
