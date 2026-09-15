import { describe, expect, it } from "vitest";

import {
  emptyLifecycleJournal,
  lifecycleJournalCapacity,
  type LifecycleAuditEvent,
  recordLifecycleEvent,
} from "../../src/audit/lifecycle-journal";

describe("recordLifecycleEvent", () => {
  it("records correlation ID, local actor, time, outcome, and safe reason", () => {
    const journal = recordLifecycleEvent(emptyLifecycleJournal, {
      actorAccountId: "account-001",
      correlationId: "correlation-001",
      eventId: "audit:correlation-001:revoked",
      eventType: "relationship.revoked",
      occurredAt: "2026-09-15T12:00:00.000Z",
      outcome: "recorded",
      reason: "administrator-revoked",
      relationshipId: "relationship-001",
    });

    expect(journal.events).toEqual([
      {
        actorAccountId: "account-001",
        correlationId: "correlation-001",
        eventId: "audit:correlation-001:revoked",
        eventType: "relationship.revoked",
        occurredAt: "2026-09-15T12:00:00.000Z",
        outcome: "recorded",
        reason: "administrator-revoked",
        relationshipId: "relationship-001",
      },
    ]);
  });

  it("keeps only safe fields when the caller spreads a richer object in", () => {
    // Callers sit next to signed envelopes and secrets. Evidence is the one
    // record an administrator reads, so the journal copies a fixed set of
    // safe fields rather than trusting every caller to strip its own inputs.
    const journal = recordLifecycleEvent(emptyLifecycleJournal, {
      correlationId: "correlation-001",
      endpointUrl: "https://green.example/x/abc123",
      eventId: "audit:correlation-001:denied",
      eventType: "peer.authentication-failed",
      occurredAt: "2026-09-15T12:00:00.000Z",
      outcome: "denied",
      payload: { issueKey: "BLUE-101" },
      reason: "signature-mismatch",
      secret: "c2VjcmV0",
      signature: "sha256=deadbeef",
    } as LifecycleAuditEvent);

    expect(Object.keys(journal.events[0] ?? {}).sort()).toEqual([
      "correlationId",
      "eventId",
      "eventType",
      "occurredAt",
      "outcome",
      "reason",
    ]);
  });

  it("never rewrites an event ID already on record", () => {
    // A redelivered peer operation or a resubmitted admin action must not be
    // able to duplicate history or restate an outcome that already happened.
    const first = recordLifecycleEvent(emptyLifecycleJournal, {
      correlationId: "correlation-001",
      eventId: "audit:correlation-001:approved",
      eventType: "relationship.nomination-approved",
      occurredAt: "2026-09-15T12:00:00.000Z",
      outcome: "recorded",
    });
    const replayed = recordLifecycleEvent(first, {
      correlationId: "correlation-001",
      eventId: "audit:correlation-001:approved",
      eventType: "relationship.nomination-rejected",
      occurredAt: "2026-09-15T13:00:00.000Z",
      outcome: "recorded",
      reason: "changed-my-mind",
    });

    expect(replayed.events).toEqual(first.events);
  });

  it("retains the most recent evidence within its capacity", () => {
    // The whole journal is one durable value, so it cannot grow without
    // bound. Dropping the oldest evidence keeps the admin view readable and
    // keeps a flood of denials from making the journal unwritable.
    const filled = Array.from(
      { length: lifecycleJournalCapacity + 2 },
      (_, index) => index,
    ).reduce(
      (journal, index) =>
        recordLifecycleEvent(journal, {
          correlationId: `correlation-${index}`,
          eventId: `audit:${index}`,
          eventType: "peer.request-replayed",
          occurredAt: "2026-09-15T12:00:00.000Z",
          outcome: "denied",
          reason: "request-replayed",
        }),
      emptyLifecycleJournal,
    );

    expect(filled.events).toHaveLength(lifecycleJournalCapacity);
    expect(filled.events[0]?.eventId).toBe("audit:2");
    expect(filled.events.at(-1)?.eventId).toBe(
      `audit:${lifecycleJournalCapacity + 1}`,
    );
  });
});
