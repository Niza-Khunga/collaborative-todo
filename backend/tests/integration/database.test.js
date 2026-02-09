// tests/integration/database.test.js
const { Pool } = require("pg");
const { setupTestDB, teardownTestDB } = require("../helpers/dbHelpers");

describe("Database Operations", () => {
  let pool;

  beforeAll(async () => {
    pool = await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB(pool);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE users, todo_lists, todos CASCADE");
  });

  test("should create and retrieve a user", async () => {
    const email = "test@example.com";
    const username = "testuser";

    // Create user
    await pool.query(
      "INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3)",
      [email, username, "hashedpassword"]
    );

    // Retrieve user
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].email).toBe(email);
    expect(result.rows[0].username).toBe(username);
  });

  test("should maintain referential integrity with foreign keys", async () => {
    // Try to insert todo with non-existent list (should fail)
    await expect(
      pool.query(
        "INSERT INTO todos (content, list_id, user_id) VALUES ($1, $2, $3)",
        ["Test todo", 999, 1] // list_id 999 doesn't exist
      )
    ).rejects.toThrow("violates foreign key constraint");
  });

  test("should cascade delete todos when list is deleted", async () => {
    // Create user, list, and todo
    const userResult = await pool.query(
      "INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id",
      ["user@example.com", "user", "hash"]
    );
    const userId = userResult.rows[0].id;

    const listResult = await pool.query(
      "INSERT INTO todo_lists (name, owner_id) VALUES ($1, $2) RETURNING id",
      ["Test List", userId]
    );
    const listId = listResult.rows[0].id;

    await pool.query(
      "INSERT INTO todos (content, list_id, user_id) VALUES ($1, $2, $3)",
      ["Test Todo", listId, userId]
    );

    // Verify todo exists
    let todos = await pool.query("SELECT * FROM todos WHERE list_id = $1", [
      listId,
    ]);
    expect(todos.rows).toHaveLength(1);

    // Delete list (should cascade to todos)
    await pool.query("DELETE FROM todo_lists WHERE id = $1", [listId]);

    // Verify todo was deleted
    todos = await pool.query("SELECT * FROM todos WHERE list_id = $1", [
      listId,
    ]);
    expect(todos.rows).toHaveLength(0);
  });
});
