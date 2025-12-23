import { logEvent } from "@/shared/logger";

test("logger rejects email-like content", () => {
  expect(() =>
    logEvent("test.event", { any: "test@example.com" })
  ).toThrow();
});
