// scripts/test-user.js
const User = require("../models/User");

async function test() {
  try {
    const user = await User.create({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
    });
    console.log("✅ User created:", user);

    const found = await User.findByEmail("test@example.com");
    console.log("✅ User found:", found);

    const isValid = await User.comparePassword(
      "password123",
      found.password_hash
    );
    console.log("✅ Password valid:", isValid);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

test();
