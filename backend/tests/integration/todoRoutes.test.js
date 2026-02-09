// tests/integration/todoRoutes.test.js
const request = require("supertest");
const app = require("../../src/app");
const { generateToken } = require("../../src/utils/authUtils");
const { pool } = require("../../src/db/db");

describe("Todo API (Authenticated)", () => {
  let authToken;
  let userId;
  let listId;

  beforeAll(async () => {
    // Create test user and get token
    const userResult = await pool.query(
      "INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id",
      ["todo@test.com", "todouser", "hashedpass"]
    );
    userId = userResult.rows[0].id;

    // Create test list
    const listResult = await pool.query(
      "INSERT INTO todo_lists (name, owner_id) VALUES ($1, $2) RETURNING id",
      ["Test Todo List", userId]
    );
    listId = listResult.rows[0].id;

    authToken = generateToken({ id: userId, email: "todo@test.com" });
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE todos CASCADE");
  });

  describe("POST /api/lists/:listId/todos", () => {
    test("should create a new todo", async () => {
      const todoData = {
        content: "Test todo item with **markdown**",
        position: 0,
      };

      const response = await request(app)
        .post(`/api/lists/${listId}/todos`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(todoData)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.content).toBe(todoData.content);
      expect(response.body.position).toBe(0);
      expect(response.body.userId).toBe(userId);
      expect(response.body.listId).toBe(listId);
    });

    test("should enforce ownership/collaboration", async () => {
      // Create another user
      const otherUserResult = await pool.query(
        "INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id",
        ["other@test.com", "otheruser", "hash"]
      );
      const otherUserId = otherUserResult.rows[0].id;
      const otherUserToken = generateToken({
        id: otherUserId,
        email: "other@test.com",
      });

      // Other user shouldn't be able to add to list they don't own/collaborate on
      await request(app)
        .post(`/api/lists/${listId}/todos`)
        .set("Authorization", `Bearer ${otherUserToken}`)
        .send({ content: "Hacker todo" })
        .expect(403); // Forbidden
    });
  });

  describe("PUT /api/todos/:id", () => {
    test("should update todo content and markdown", async () => {
      // First create a todo
      const createResult = await pool.query(
        "INSERT INTO todos (content, list_id, user_id) VALUES ($1, $2, $3) RETURNING id",
        ["Original content", listId, userId]
      );
      const todoId = createResult.rows[0].id;

      const updateData = {
        content: "Updated content with **bold** markdown",
        isCompleted: true,
      };

      const response = await request(app)
        .put(`/api/todos/${todoId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.content).toBe(updateData.content);
      expect(response.body.isCompleted).toBe(true);
      expect(response.body.updatedAt).not.toBe(response.body.createdAt);
    });

    test("should prevent updating other users' todos", async () => {
      // Create todo as another user
      const otherUserResult = await pool.query(
        "INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id",
        ["other2@test.com", "otheruser2", "hash"]
      );
      const otherUserId = otherUserResult.rows[0].id;

      const todoResult = await pool.query(
        "INSERT INTO todos (content, list_id, user_id) VALUES ($1, $2, $3) RETURNING id",
        ["Other user todo", listId, otherUserId]
      );
      const todoId = todoResult.rows[0].id;

      // Try to update as different user
      await request(app)
        .put(`/api/todos/${todoId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ content: "Hacked content" })
        .expect(403);
    });
  });

  describe("DELETE /api/todos/:id", () => {
    test("should soft delete or remove todo", async () => {
      const todoResult = await pool.query(
        "INSERT INTO todos (content, list_id, user_id) VALUES ($1, $2, $3) RETURNING id",
        ["Todo to delete", listId, userId]
      );
      const todoId = todoResult.rows[0].id;

      await request(app)
        .delete(`/api/todos/${todoId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(204);

      // Verify it's deleted
      const checkResult = await pool.query(
        "SELECT * FROM todos WHERE id = $1",
        [todoId]
      );
      expect(checkResult.rows).toHaveLength(0);
    });
  });
});
