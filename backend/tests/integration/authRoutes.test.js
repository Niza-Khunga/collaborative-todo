// tests/integration/authRoutes.test.js
const request = require("supertest");
const app = require("../../src/app");
const { pool } = require("../../src/db/db");

describe("Authentication API", () => {
  beforeEach(async () => {
    await pool.query("TRUNCATE users CASCADE");
  });

  describe("POST /api/auth/register", () => {
    test("should register new user successfully", async () => {
      const userData = {
        username: "newuser",
        email: "new@example.com",
        password: "SecurePass123!",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect("Content-Type", /json/)
        .expect(201);

      expect(response.body).toHaveProperty("token");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.password).toBeUndefined(); // Password shouldn't be in response
    });

    test("should reject duplicate email", async () => {
      // Create first user
      await request(app).post("/api/auth/register").send({
        username: "user1",
        email: "duplicate@example.com",
        password: "pass123",
      });

      // Try to create second user with same email
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          username: "user2",
          email: "duplicate@example.com",
          password: "pass456",
        })
        .expect(400);

      expect(response.body.error).toContain("Email already exists");
    });

    test("should validate password strength", async () => {
      const weakPasswordData = {
        username: "testuser",
        email: "test@example.com",
        password: "123", // Too weak
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.error).toContain("Password must be at least");
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Create a test user
      await request(app).post("/api/auth/register").send({
        username: "testuser",
        email: "login@example.com",
        password: "SecurePass123!",
      });
    });

    test("should login with valid credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "login@example.com",
          password: "SecurePass123!",
        })
        .expect(200);

      expect(response.body).toHaveProperty("token");
      expect(response.body.user.email).toBe("login@example.com");
    });

    test("should reject invalid password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "login@example.com",
          password: "WrongPassword",
        })
        .expect(401);

      expect(response.body.error).toContain("Invalid credentials");
    });

    test("should reject non-existent user", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "SomePassword",
        })
        .expect(401);

      expect(response.body.error).toContain("Invalid credentials");
    });
  });
});
