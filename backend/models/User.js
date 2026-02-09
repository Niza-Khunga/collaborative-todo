// models/User.js
const { query } = require("../config/db");
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

class User {
  /**
   * Create a new user with hashed password
   * @param {Object} userData - { username, email, password }
   * @returns {Object} Created user (without password_hash)
   */
  static async create({ username, email, password }) {
    // Validate input
    if (!username || !email || !password) {
      throw new Error("Username, email, and password are required");
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert into DB
    const result = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES (?, ?, ?)
       RETURNING id, username, email, created_at`,
      [username, email, password_hash]
    );

    // SQLite returns array; PostgreSQL returns { rows: [...] }
    const user = Array.isArray(result) ? result[0] : result.rows[0];
    return user;
  }

  /**
   * Find a user by email
   * @param {string} email
   * @returns {Object|null} User or null
   */
  static async findByEmail(email) {
    const result = await query(
      "SELECT id, username, email, password_hash, created_at FROM users WHERE email = ?",
      [email]
    );

    const users = Array.isArray(result) ? result : result.rows;
    return users[0] || null;
  }

  /**
   * Compare a plain password with hashed password
   * @param {string} plainPassword
   * @param {string} hashedPassword
   * @returns {boolean}
   */
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = User;
