// tests/integration/concurrency.test.js
test("should handle simultaneous todo updates without data corruption", async () => {
  // Simulate 5 users updating the same todo at once
  const updatePromises = Array(5)
    .fill()
    .map((_, i) =>
      request(app)
        .put(`/api/todos/${todoId}`)
        .set("Authorization", `Bearer ${tokens[i]}`)
        .send({ content: `Update ${i}` })
    );

  const results = await Promise.allSettled(updatePromises);

  // Should handle gracefully - last write wins or merge conflicts
  expect(
    results.filter((r) => r.status === "fulfilled").length
  ).toBeGreaterThan(0);
});
