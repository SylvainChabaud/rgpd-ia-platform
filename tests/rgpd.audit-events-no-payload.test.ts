import { emitAuditEvent } from "@/app/audit/emitAuditEvent";
import { InMemoryAuditEventWriter } from "@/app/audit/InMemoryAuditEventWriter";
import { newId } from "@/shared/ids";
import { withLogCapture } from "@/testing/logCapture";
import { ACTOR_SCOPE } from "@/shared/actorScope";

test("audit event rejects forbidden metadata keys", async () => {
  const writer = new InMemoryAuditEventWriter();

  await expect(
    emitAuditEvent(writer, {
      id: newId(),
      eventName: "audit.test",
      actorScope: ACTOR_SCOPE.SYSTEM,
      metadata: { payload: "nope" },
    })
  ).rejects.toThrow();
});

test("audit event rejects email-like metadata values", async () => {
  const writer = new InMemoryAuditEventWriter();

  await expect(
    emitAuditEvent(writer, {
      id: newId(),
      eventName: "audit.test",
      actorScope: ACTOR_SCOPE.SYSTEM,
      metadata: { note: "user@example.com" },
    })
  ).rejects.toThrow();
});

test("audit logs are event-only", async () => {
  const writer = new InMemoryAuditEventWriter();

  const { logs } = await withLogCapture(async () => {
    await emitAuditEvent(writer, {
      id: newId(),
      eventName: "audit.safe",
      actorScope: ACTOR_SCOPE.SYSTEM,
      metadata: { reason: "seed" },
    });
  });

  expect(writer.events).toHaveLength(1);
  const dump = logs.map((log) => JSON.stringify(log.entry)).join(" ");
  expect(dump).not.toMatch(/reason/i);
});
