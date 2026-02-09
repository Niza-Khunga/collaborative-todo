// tests/unit/todoValidator.test.js
const {
  validateTodo,
  sanitizeTodoContent,
} = require("../../src/utils/todoValidator");

describe("Todo Validation", () => {
  test("should accept valid todo data", () => {
    const validTodo = {
      content: "Buy groceries",
      listId: 1,
      userId: 1,
    };

    const { isValid, errors } = validateTodo(validTodo);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  test("should reject empty content", () => {
    const invalidTodo = {
      content: "",
      listId: 1,
      userId: 1,
    };

    const { isValid, errors } = validateTodo(invalidTodo);
    expect(isValid).toBe(false);
    expect(errors).toContain("Content is required");
  });

  test("should reject extremely long content", () => {
    const longContent = "a".repeat(10001);
    const invalidTodo = {
      content: longContent,
      listId: 1,
      userId: 1,
    };

    const { isValid, errors } = validateTodo(invalidTodo);
    expect(isValid).toBe(false);
    expect(errors).toContain("Content cannot exceed 10000 characters");
  });

  test("should sanitize HTML/markdown content", () => {
    const maliciousContent = '<script>alert("xss")</script># Heading';
    const sanitized = sanitizeTodoContent(maliciousContent);

    expect(sanitized).not.toContain("<script>");
    expect(sanitized).toContain("# Heading");
  });

  test("should extract hashtags from content", () => {
    const content = "Buy groceries #shopping #important";
    const { hashtags } = validateTodo({ content, listId: 1 });

    expect(hashtags).toEqual(["shopping", "important"]);
  });
});
