import { describe, expect, it } from "vitest";

import { type AuditJournal, appendAuditEvents } from "../../src/audit/journal";

const queuedEvent = {
  candidateId: "candidate:event-one",
  correlationId: "corr-publish-001",
  eventId: "audit:event-one",
  eventType: "publication.queued",
  idempotencyKey: "event-one",
  occurredAt: "2026-08-04T15:00:00.000Z",
  pairingId: "pairing-001",
  protocolVersion: "v1",
} as const;

const failedEvent = {
  candidateId: "candidate:event-one",
  correlationId: "corr-publish-001",
  eventId: "audit:failure-one",
  eventType: "publication.delivery-failed",
  idempotencyKey: "failure-one",
  occurredAt: "2026-08-04T15:30:00.000Z",
  pairingId: "pairing-001",
  protocolVersion: "v1",
  reason: "terminal-error",
} as const;

const emptyJournal: AuditJournal = { events: [] };

describe("appendAuditEvents", () => {
  it("appends events in the order they occurred without mutating the journal", () => {
    const journal = appendAuditEvents(emptyJournal, [queuedEvent, failedEvent]);

    expect(journal.events).toEqual([queuedEvent, failedEvent]);
    expect(emptyJournal.events).toEqual([]);
  });

  it("ignores an event already recorded under the same event ID", () => {
    const first = appendAuditEvents(emptyJournal, [queuedEvent]);

    const replayed = appendAuditEvents(first, [queuedEvent, failedEvent]);

    expect(replayed.events).toEqual([queuedEvent, failedEvent]);
  });
});
