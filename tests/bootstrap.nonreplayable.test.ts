import { logInfo } from "../src/shared/logger";

test("logger rejects email-like content", () => {
  expect(() => logInfo({ event: "x", meta: { any: "test@example.com" } })).toThrow();
});
