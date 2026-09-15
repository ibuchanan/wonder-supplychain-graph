import { kvs } from "@forge/kvs";

import {
  emptyLifecycleJournal,
  type LifecycleAuditEvent,
  type LifecycleAuditJournal,
  recordLifecycleEvent,
} from "./lifecycle-journal";

const lifecycleJournalKey = "lifecycle-audit-journal";

export const kvsLifecycleJournalStore = {
  read: async (): Promise<LifecycleAuditJournal> =>
    (await kvs.get<LifecycleAuditJournal>(lifecycleJournalKey)) ??
    emptyLifecycleJournal,
  write: async (journal: LifecycleAuditJournal): Promise<void> => {
    await kvs.set(lifecycleJournalKey, { events: journal.events });
  },
};

/**
 * Records one lifecycle outcome durably. Evidence must never be the reason an
 * operation fails, so a journal this tenant cannot write is swallowed here: the
 * denial or success the caller is recording has already been decided.
 */
export async function recordLifecycleOutcome(
  event: LifecycleAuditEvent,
): Promise<void> {
  try {
    await kvsLifecycleJournalStore.write(
      recordLifecycleEvent(await kvsLifecycleJournalStore.read(), event),
    );
  } catch {
    // Intentionally ignored: see above.
  }
}
