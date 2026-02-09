// routes/todos.js
const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const db = require("../config/db");

module.exports = (io) => {
  const router = express.Router();

  // 🔒 Apply auth middleware to ALL routes in this file
  router.use(authenticateToken);

  // GET /api/lists/:listId/todos → Get all todos in a list
  router.get("/lists/:listId/todos", async (req, res) => {
    try {
      const { listId } = req.params;
      const userId = req.user.id;

      const result = await db.query(
        `SELECT id, content, is_completed, position, created_at, updated_at
       FROM todos
       WHERE list_id = ? AND user_id = ?
       ORDER BY position ASC`,
        [listId, userId],
      );

      const todos = Array.isArray(result) ? result : result.rows;
      res.json({ todos });
    } catch (err) {
      console.error("Error fetching todos:", err);
      res.status(500).json({ error: "Failed to fetch todos" });
    }
  });

  // POST /api/lists/:listId/todos → Create a new todo
  router.post("/lists/:listId/todos", async (req, res) => {
    try {
      const { listId } = req.params;
      const { content, is_completed = false, position = 0 } = req.body;
      const userId = req.user.id;

      if (!content) {
        return res.status(400).json({ error: "Todo content is required" });
      }

      // Get max position to append at end
      const maxPosResult = await db.query(
        `SELECT MAX(position) as max_pos FROM todos WHERE list_id = ?`,
        [listId],
      );
      const maxPos = Array.isArray(maxPosResult)
        ? maxPosResult[0]?.max_pos || 0
        : maxPosResult.rows[0]?.max_pos || 0;
      const newPosition = position > maxPos ? position : maxPos + 1;

      const result = await db.query(
        `INSERT INTO todos (content, list_id, user_id, is_completed, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, content, is_completed, position, created_at, updated_at`,
        [content, listId, userId, is_completed, newPosition],
      );

      const todo = Array.isArray(result) ? result[0] : result.rows[0];
      res.status(201).json({ message: "Todo created", todo });

      // Emit real-time update
      io.to(`list-${listId}`).emit("todo-added", { todo });
    } catch (err) {
      console.error("Error creating todo:", err);
      res.status(500).json({ error: "Failed to create todo" });
    }
  });

  // PUT /api/todos/:id → Update a todo
  router.put("/todos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { content, is_completed, position } = req.body;
      const userId = req.user.id;

      const updates = [];
      const params = [];

      if (content !== undefined) {
        updates.push(`content = ?`);
        params.push(content);
      }
      if (is_completed !== undefined) {
        updates.push(`is_completed = ?`);
        params.push(is_completed);
      }
      if (position !== undefined) {
        updates.push(`position = ?`);
        params.push(position);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      params.push(id, userId); // Add ID and user ID for WHERE clause

      const result = await db.query(
        `UPDATE todos SET ${updates.join(
          ", ",
        )}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? RETURNING id, content, is_completed, position, updated_at`,
        params,
      );

      const todo = Array.isArray(result) ? result[0] : result.rows[0];
      if (!todo) {
        return res
          .status(404)
          .json({ error: "Todo not found or not owned by user" });
      }

      // Get list ID for emitting event
      const listId = todo.list_id;

      res.json({ message: "Todo updated", todo });

      // Emit real-time update
      io.to(`list-${listId}`).emit("todo-changed", todo);
    } catch (err) {
      console.error("Error updating todo:", err);
      res.status(500).json({ error: "Failed to update todo" });
    }
  });

  // DELETE /api/todos/:id → Delete a todo
  router.delete("/todos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await db.query(
        `DELETE FROM todos WHERE id = ? AND user_id = ? RETURNING id, list_id`,
        [id, userId],
      );

      const deleted = Array.isArray(result) ? result[0] : result.rows[0];
      if (!deleted) {
        return res
          .status(404)
          .json({ error: "Todo not found or not owned by user" });
      }

      const listId = deleted.list_id;

      res.json({ message: "Todo deleted", id: deleted.id });

      // Emit real-time update
      io.to(`list-${listId}`).emit("todo-removed", deleted.id);
    } catch (err) {
      console.error("Error deleting todo:", err);
      res.status(500).json({ error: "Failed to delete todo" });
    }
  });
  // PUT /api/lists/:listId/todos/reorder → Update positions for all todos
  router.put("/lists/:listId/todos/reorder", async (req, res) => {
    try {
      const { listId } = req.params;
      const { todos } = req.body; // [{ id, position }, ...]
      const userId = req.user.id;

      // Validate input
      if (!Array.isArray(todos) || todos.length === 0) {
        return res.status(400).json({ error: "Invalid todos array" });
      }

      // Update each todo's position in DB
      for (const todo of todos) {
        const result = await db.query(
          `UPDATE todos SET position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? RETURNING id`,
          [todo.position, todo.id, userId],
        );

        // If no row updated, todo doesn't exist or isn't owned by user
        const updated = Array.isArray(result) ? result[0] : result.rows?.[0];
        if (!updated) {
          return res
            .status(404)
            .json({ error: `Todo ${todo.id} not found or not owned by user` });
        }
      }

      // Success: return updated todos
      res.json({ message: "Todos reordered successfully", todos });

      // Emit real-time event to all clients in this list
      io.to(`list-${listId}`).emit("todos-reordered", todos);
    } catch (err) {
      console.error("Error reordering todos:", err);
      res.status(500).json({ error: "Failed to reorder todos" });
    }
  });
  return router;
};
