// tests/integration/socketIntegration.test.js
const { createServer } = require("http");
const { Server } = require("socket.io");
const Client = require("socket.io-client");
const { setupSocketServer } = require("../../src/sockets");

describe("Socket.io Real-time Collaboration", () => {
  let io, serverSocket, clientSocket, server;

  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    setupSocketServer(io);

    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      io.on("connection", (socket) => {
        serverSocket = socket;
      });
      clientSocket.on("connect", done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
  });

  test("should join list room and receive confirmation", (done) => {
    const listId = 123;

    clientSocket.emit("join-list", listId);

    // Simulate server-side join
    serverSocket.on("join-list", (receivedListId) => {
      expect(receivedListId).toBe(listId);

      // Server should add socket to room
      expect(serverSocket.rooms.has(`list-${listId}`)).toBe(true);

      // Server can emit confirmation
      clientSocket.on("joined-list", (confirmation) => {
        expect(confirmation.listId).toBe(listId);
        expect(confirmation.userCount).toBeDefined();
        done();
      });

      serverSocket.emit("joined-list", { listId, userCount: 1 });
    });
  });

  test("should broadcast todo updates to room", (done) => {
    const listId = 456;
    const testTodo = { id: 1, content: "Test", listId };

    // Join a room
    clientSocket.emit("join-list", listId);

    // Listen for todo updates
    clientSocket.on("todo-added", (todo) => {
      expect(todo).toEqual(testTodo);
      done();
    });

    // Simulate another user adding a todo
    setTimeout(() => {
      serverSocket.to(`list-${listId}`).emit("todo-added", testTodo);
    }, 100);
  });

  test("should handle concurrent updates correctly", (done) => {
    const listId = 789;
    let updateCount = 0;

    clientSocket.emit("join-list", listId);

    clientSocket.on("todo-changed", (todo) => {
      updateCount++;

      if (updateCount === 2) {
        // Both updates should be received
        done();
      }
    });

    // Simulate rapid updates
    serverSocket
      .to(`list-${listId}`)
      .emit("todo-changed", { id: 1, content: "Update 1" });
    serverSocket
      .to(`list-${listId}`)
      .emit("todo-changed", { id: 1, content: "Update 2" });
  });
});
