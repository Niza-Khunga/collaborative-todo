// tests/e2e/collaborationFlow.test.js
const request = require("supertest");
const app = require("../../src/app");
const { Client } = require("socket.io-client");

describe("Complete Collaboration Flow", () => {
  let user1Token, user2Token;
  let listId;
  let user1Socket, user2Socket;

  beforeAll(async () => {
    // Setup: Create two users
    const user1Res = await request(app).post("/api/auth/register").send({
      username: "collab1",
      email: "collab1@test.com",
      password: "Pass123!",
    });
    user1Token = user1Res.body.token;

    const user2Res = await request(app).post("/api/auth/register").send({
      username: "collab2",
      email: "collab2@test.com",
      password: "Pass123!",
    });
    user2Token = user2Res.body.token;

    // User1 creates a list
    const listRes = await request(app)
      .post("/api/lists")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ name: "Collaboration List" });
    listId = listRes.body.id;

    // User1 adds user2 as collaborator
    await request(app)
      .post(`/api/lists/${listId}/collaborators`)
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ email: "collab2@test.com" });
  });

  beforeEach((done) => {
    // Setup WebSocket connections
    user1Socket = new Client("http://localhost:5000", {
      auth: { token: user1Token },
    });

    user2Socket = new Client("http://localhost:5000", {
      auth: { token: user2Token },
    });

    // Wait for both to connect
    let connectedCount = 0;
    const checkConnected = () => {
      connectedCount++;
      if (connectedCount === 2) done();
    };

    user1Socket.on("connect", checkConnected);
    user2Socket.on("connect", checkConnected);
  });

  afterEach(() => {
    user1Socket.close();
    user2Socket.close();
  });

  test("should see real-time updates between collaborators", (done) => {
    let todoCreated = false;
    let todoReceived = false;

    // Both users join the list room
    user1Socket.emit("join-list", listId);
    user2Socket.emit("join-list", listId);

    // User2 listens for new todos
    user2Socket.on("todo-added", (todo) => {
      expect(todo.content).toBe("Collaborative todo");
      todoReceived = true;
      if (todoCreated && todoReceived) done();
    });

    // User1 creates a todo
    setTimeout(async () => {
      await request(app)
        .post(`/api/lists/${listId}/todos`)
        .set("Authorization", `Bearer ${user1Token}`)
        .send({
          content: "Collaborative todo",
          position: 0,
        });
      todoCreated = true;
      if (todoCreated && todoReceived) done();
    }, 500);
  });

  test("should handle concurrent drag-and-drop", (done) => {
    // Create initial todos
    const initialTodos = [
      { content: "Todo 1", position: 0 },
      { content: "Todo 2", position: 1 },
      { content: "Todo 3", position: 2 },
    ];

    let reorderEvents = 0;
    const expectedOrder = [2, 0, 1]; // After reorder

    // Both users listen for reorder events
    user1Socket.on("todos-reordered", (todos) => {
      const positions = todos.map((t) => t.position);
      expect(positions).toEqual([0, 1, 2]); // Should be sequential
      reorderEvents++;
      if (reorderEvents === 2) done(); // Both users received it
    });

    user2Socket.on("todos-reordered", (todos) => {
      reorderEvents++;
      if (reorderEvents === 2) done();
    });

    // User1 reorders todos
    setTimeout(() => {
      user1Socket.emit("todos-reordered", {
        listId,
        todos: [
          { id: 2, position: 0 },
          { id: 0, position: 1 },
          { id: 1, position: 2 },
        ],
      });
    }, 500);
  });
});
