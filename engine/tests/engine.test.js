const { add } = require("../src/index");

test("add works", () => {
  expect(add(2, 3)).toBe(5);
});