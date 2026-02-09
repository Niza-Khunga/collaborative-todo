// sockets/todoSocket.js
module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    // Join a specific list room
    socket.on("join-list", (listId) => {
      socket.join(`list-${listId}`);
      console.log(`User ${socket.id} joined list ${listId}`);
    });

    // Leave list room
    socket.on("leave-list", (listId) => {
      socket.leave(`list-${listId}`);
      console.log(`User ${socket.id} left list ${listId}`);
    });

    // Todo created event
    socket.on("todo-created", (data) => {
      const { listId, todo } = data;
      socket.to(`list-${listId}`).emit("todo-added", todo);
    });

    // Todo updated event
    socket.on("todo-updated", (data) => {
      const { listId, todo } = data;
      socket.to(`list-${listId}`).emit("todo-changed", todo);
    });

    // Todo deleted event
    socket.on("todo-deleted", (data) => {
      const { listId, todoId } = data;
      socket.to(`list-${listId}`).emit("todo-removed", todoId);
    });

    // Todo reordered event (for drag-and-drop)
    socket.on("todos-reordered", (data) => {
      const { listId, todos } = data;

      socket.to(`list-${listId}`).emit("todos-reordered", todos);
    });

    // Disconnect cleanup
    socket.on("disconnect", () => {
      console.log("🔌 User disconnected:", socket.id);
    });
  });
};
