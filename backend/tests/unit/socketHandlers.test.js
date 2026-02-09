// tests/unit/socketHandlers.test.js
const {
  handleTodoCreated,
  handleTodoUpdated,
  handleTodoReordered,
} = require("../../src/sockets/todoHandlers");

// Mock database functions
jest.mock("../../src/models/Todo", () => ({
  create: jest.fn(),
  update: jest.fn(),
  reorder: jest.fn(),
}));

describe("Socket Event Handlers", () => {
  let mockSocket;
  let mockIo;

  beforeEach(() => {
    mockSocket = {
      id: "socket-123",
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };

    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
  });

  test("should handle todo creation and notify room", async () => {
    const mockTodo = { id: 1, content: "Test todo", listId: 5 };

    await handleTodoCreated(mockIo, mockSocket, mockTodo);

    expect(mockSocket.join).toHaveBeenCalledWith("list-5");
    expect(mockIo.to).toHaveBeenCalledWith("list-5");
    expect(mockIo.emit).toHaveBeenCalledWith("todo-added", mockTodo);
  });

  test("should validate todo data before broadcasting", async () => {
    const invalidTodo = { content: "" };

    await expect(
      handleTodoCreated(mockIo, mockSocket, invalidTodo)
    ).rejects.toThrow("Invalid todo data");

    expect(mockIo.emit).not.toHaveBeenCalled();
  });

  test("should handle todo reordering with position validation", async () => {
    const reorderData = {
      listId: 5,
      todos: [
        { id: 1, position: 0 },
        { id: 2, position: 1 },
        { id: 3, position: 2 },
      ],
    };

    await handleTodoReordered(mockIo, mockSocket, reorderData);

    // Check positions are sequential
    const positions = reorderData.todos.map((t) => t.position);
    expect(positions).toEqual([0, 1, 2]);

    expect(mockIo.to).toHaveBeenCalledWith("list-5");
  });
});
