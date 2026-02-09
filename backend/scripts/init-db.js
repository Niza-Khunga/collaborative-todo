// scripts/init-db.js
const fs = require("fs");
const path = require("path");
const { query } = require("../config/db");

async function initDB() {
  const schemaPath = path.join(__dirname, "../db/schema.sql");
  let sql = fs.readFileSync(schemaPath, "utf8");

  // Remove comments and split into individual statements
  sql = sql
    .replace(/--.*$/gm, "") // Remove single-line comments
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\r/g, "\n");

  // Split by semicolon and clean up
  const statements = sql
    .split(";")
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);

  console.log(`Executing ${statements.length} SQL statements...`);

  for (const stmt of statements) {
    try {
      await query(stmt + ";");
      console.log("✅ Executed:", stmt.split("\n")[0].substring(0, 50) + "...");
    } catch (err) {
      console.error("❌ Failed to execute statement:", stmt);
      throw err;
    }
  }

  console.log("✅ Database schema initialized successfully!");
  process.exit(0);
}

initDB().catch((err) => {
  console.error("💥 DB initialization failed:", err.message);
  process.exit(1);
});
