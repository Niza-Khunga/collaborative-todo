// tests/unit/authUtils.test.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
} = require("../../src/utils/authUtils");

describe("Authentication Utilities", () => {
  describe("Token Generation & Verification", () => {
    test("should generate valid JWT token", () => {
      const user = { id: 1, email: "test@example.com" };
      const token = generateToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const decoded = verifyToken(token);
      expect(decoded.id).toBe(user.id);
      expect(decoded.email).toBe(user.email);
    });

    test("should reject expired token", () => {
      const expiredToken = jwt.sign(
        { id: 1, exp: Math.floor(Date.now() / 1000) - 3600 }, // Expired 1 hour ago
        process.env.JWT_SECRET
      );

      expect(() => verifyToken(expiredToken)).toThrow("jwt expired");
    });
  });

  describe("Password Hashing", () => {
    test("should hash password correctly", async () => {
      const password = "SecurePassword123!";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    test("should validate correct password", async () => {
      const password = "SecurePassword123!";
      const hash = await hashPassword(password);
      const isValid = await comparePassword(password, hash);

      expect(isValid).toBe(true);
    });

    test("should reject incorrect password", async () => {
      const password = "SecurePassword123!";
      const hash = await hashPassword(password);
      const isValid = await comparePassword("WrongPassword", hash);

      expect(isValid).toBe(false);
    });
  });
});
