// routes/auth.js
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Helper: generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "Username, email, and password are required" });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User with this email already exists" });
    }

    // Create user
    const user = await User.create({ username, email, password });

    // Generate token
    const token = generateToken(user);

    // Return user + token (exclude sensitive data)
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error("Registration error:", err.message);
    // Handle SQLite/PostgreSQL unique constraint errors
    if (
      err.message.includes("UNIQUE constraint failed") ||
      err.message.includes("duplicate key")
    ) {
      return res.status(409).json({ error: "Username or email already taken" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// @route   POST /api/auth/login
// @desc    Log in existing user
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await User.comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
