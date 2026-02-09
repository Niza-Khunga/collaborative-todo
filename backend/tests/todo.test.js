// backend/tests/todo.test.js
const request = require("supertest");
const app = require("../app");

describe("Todo API", () => {
  test("GET /api/lists should return user lists", async () => {
    const response = await request(app)
      .get("/api/lists")
      .set("Authorization", `Bearer ${testToken}`);
    expect(response.statusCode).toBe(200);
  });
});
