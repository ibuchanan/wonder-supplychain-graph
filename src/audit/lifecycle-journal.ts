/**
 * The tenant-local lifecycle audit journal: non-secret, non-content evidence
 * of relationship and Pairing lifecycle and security outcomes. It is the only
 * place an administrator can tell a forged signature from an unauthorized
 * relationship, so it must never become a place a secret can leak to.
 */

/** Every lifecycle and security outcome this tenant keeps evidence of. */
export type LifecycleEventType =
  | "peer.authentication-failed"
  | "peer.request-replayed"
  | "relationship.activated"
  | "relationship.confirmed"
  | "relationship.expired"
  | "relationship.invitation-created"
  | "relationship.invitation-recipient-mismatch"
  | "relationship.invitation-viewed"
  | "relationship.nominated"
  | "relationship.nomination-approved"
  | "relationship.nomination-rejected"
  | "relationship.revoked";

export type LifecycleOutcome = "denied" | "recorded";

export interface LifecycleAuditEvent {
  /** The local Atlassian account that acted, where the tenant knows it. */
  readonly actorAccountId?: string;
  /**
   * Absent only where no trustworthy one exists: a request that failed
   * authentication carries nothing but attacker-supplied identifiers.
   */
  readonly correlationId?: string;
  readonly eventId: string;
  readonly eventType: LifecycleEventType;
  readonly occurredAt: string;
  readonly outcome: LifecycleOutcome;
  /** A safe reason code, never a signature, secret, endpoint, or content. */
  readonly reason?: string;
  readonly relationshipId?: string;
}

export interface LifecycleAuditJournal {
  readonly events: readonly LifecycleAuditEvent[];
}

export const emptyLifecycleJournal: LifecycleAuditJournal = Object.freeze({
  events: Object.freeze([]),
});

/**
 * How much evidence one tenant retains. The journal is a single durable value,
 * so it is bounded: a flood of denials must not make it unwritable, and the
 * administrator view must stay readable.
 */
export const lifecycleJournalCapacity = 200;

/**
 * Copies one event field by field. Callers run next to signed envelopes and
 * secrets, so the journal narrows what it keeps rather than trusting every
 * caller to have stripped its own inputs first.
 */
function safeEvent(event: LifecycleAuditEvent): LifecycleAuditEvent {
  return Object.freeze({
    ...(event.actorAccountId ? { actorAccountId: event.actorAccountId } : {}),
    ...(event.correlationId ? { correlationId: event.correlationId } : {}),
    eventId: event.eventId,
    eventType: event.eventType,
    occurredAt: event.occurredAt,
    outcome: event.outcome,
    ...(event.reason ? { reason: event.reason } : {}),
    ...(event.relationshipId ? { relationshipId: event.relationshipId } : {}),
  });
}

/**
 * Appends evidence. Append-only means an event ID already on record is never
 * rewritten, so a redelivered operation cannot duplicate or restate history.
 */
export function recordLifecycleEvent(
  journal: LifecycleAuditJournal,
  event: LifecycleAuditEvent,
): LifecycleAuditJournal {
  if (journal.events.some((recorded) => recorded.eventId === event.eventId)) {
    return journal;
  }

  return {
    events: [...journal.events, safeEvent(event)].slice(
      -lifecycleJournalCapacity,
    ),
  };
}
