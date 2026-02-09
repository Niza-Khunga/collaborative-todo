// routes/lists.js
const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const db = require("../config/db");

const router = express.Router();

// 🔒 Apply auth middleware to ALL routes in this file
router.use(authenticateToken);

// GET /api/lists → Get all lists for current user
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT id, name, created_at FROM todo_lists WHERE owner_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    const lists = Array.isArray(result) ? result : result.rows;
    res.json({ lists });
  } catch (err) {
    console.error("Error fetching lists:", err);
    res.status(500).json({ error: "Failed to fetch lists" });
  }
});

// POST /api/lists → Create a new list
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: "List name is required" });
    }

    const result = await db.query(
      `INSERT INTO todo_lists (name, owner_id) VALUES (?, ?) RETURNING id, name, created_at`,
      [name, userId]
    );

    const list = Array.isArray(result) ? result[0] : result.rows[0];
    res.status(201).json({ message: "List created", list });
  } catch (err) {
    console.error("Error creating list:", err);
    res.status(500).json({ error: "Failed to create list" });
  }
});

// PUT /api/lists/:id → Update list name
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: "New name is required" });
    }

    const result = await db.query(
      `UPDATE todo_lists SET name = ?, updated_at = datetime('now') WHERE id = ? AND owner_id = ? RETURNING id, name, updated_at`,
      [name, id, userId]
    );

    const list = Array.isArray(result) ? result[0] : result.rows[0];
    if (!list) {
      return res
        .status(404)
        .json({ error: "List not found or not owned by user" });
    }

    res.json({ message: "List updated", list });
  } catch (err) {
    console.error("Error updating list:", err);
    res.status(500).json({ error: "Failed to update list" });
  }
});

// DELETE /api/lists/:id → Delete a list
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await db.query(
      `DELETE FROM todo_lists WHERE id = ? AND owner_id = ? RETURNING id`,
      [id, userId]
    );

    const deleted = Array.isArray(result) ? result[0] : result.rows[0];
    if (!deleted) {
      return res
        .status(404)
        .json({ error: "List not found or not owned by user" });
    }

    res.json({ message: "List deleted", id: deleted.id });
  } catch (err) {
    console.error("Error deleting list:", err);
    res.status(500).json({ error: "Failed to delete list" });
  }
});

module.exports = router;
