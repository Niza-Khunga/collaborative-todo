// config/db.js
const dotenv = require("dotenv");
dotenv.config();

let dbClient;
let isSQLite = false;

// Detect DB type from environment
if (process.env.DB_TYPE === "sqlite") {
  console.log("⚙️ Using SQLite database");
  const sqlite3 = require("sqlite3").verbose();
  const { open } = require("sqlite");

  isSQLite = true;

  // SQLite: Open or create database file
  dbClient = open({
    filename: "./data/collaborative_todo.db",
    driver: sqlite3.Database,
  })
    .then((db) => {
      // Enable foreign key constraints (required for ON DELETE CASCADE)
      return db.exec("PRAGMA foreign_keys = ON;").then(() => db);
    })
    .catch((err) => {
      console.error("❌ Failed to initialize SQLite:", err);
      process.exit(1);
    });
} else {
  console.log("⚙️ Using PostgreSQL database");
  const { Pool } = require("pg");

  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    // Optional: add SSL for production (e.g., on Render, Railway)
    // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  // Test connection
  pool.query("SELECT NOW()", (err) => {
    if (err) {
      console.error("❌ PostgreSQL connection error:", err.stack);
      process.exit(1);
    } else {
      console.log("✅ PostgreSQL connected");
    }
  });

  dbClient = pool;
}

/**
 * Unified query function
 * @param {string} text - SQL query string
 * @param {any[]} [params] - Query parameters
 * @returns {Promise<any>}
 */
async function query(text, params = []) {
  try {
    if (isSQLite) {
      const db = await dbClient;
      // SQLite uses `run`, `get`, `all` — but `all` works for most cases
      // For INSERT/UPDATE/DELETE, we still use `run` internally via `exec`
      // However, for simplicity and consistency, we use `all` when expecting results
      // and let the caller handle affected rows if needed.
      return await db.all(text, params);
    } else {
      // PostgreSQL: use parameterized queries
      return await dbClient.query(text, params);
    }
  } catch (err) {
    console.error("❌ Database query error:", err.message);
    console.error("Query:", text);
    console.error("Params:", params);
    throw err;
  }
}

// Export a consistent interface
module.exports = {
  query,
  isSQLite,
};
