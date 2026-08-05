import type { PublicationAuditEvent } from "../publication/apply-command";

/**
 * The tenant-local, administrator-visible audit journal. There is no central
 * ledger and no replicated event store: each tenant retains only its own
 * non-content evidence.
 */
export interface AuditJournal {
  readonly events: readonly PublicationAuditEvent[];
}

/**
 * Appends evidence without mutating the journal. Append-only means an event ID
 * already on record is never rewritten, so a replayed command cannot duplicate
 * or alter history.
 */
export function appendAuditEvents(
  journal: AuditJournal,
  events: readonly PublicationAuditEvent[],
): AuditJournal {
  const recorded = new Set(journal.events.map((event) => event.eventId));
  const appended = events.filter((event) => {
    if (recorded.has(event.eventId)) {
      return false;
    }

    recorded.add(event.eventId);

    return true;
  });

  return { events: [...journal.events, ...appended] };
}
