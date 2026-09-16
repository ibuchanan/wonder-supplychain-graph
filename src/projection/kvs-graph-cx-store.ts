import { kvs } from "@forge/kvs";
import type { GraphCxStore } from "../graph-cx-management";
import type { SupplierReceiptState } from "../receipt/apply-command";
import type { SupplierReceiptStateStore } from "./promote-demo-package";

const activeGraphCxKey = "active-graph-cx-id";

const emptySupplierReceiptState: SupplierReceiptState = {
  currentPackage: undefined,
  pairings: [],
  processedIdempotencyKeys: [],
};

function storageKey(graphCxId: string): string {
  return `supplier-receipt-state:${graphCxId}`;
}

/**
 * Tenant-local, app-scoped storage for the supplier receipt state a Teamwork
 * Graph connection projects. An unknown connection reads as empty so discovery
 * stays suppressed until a package has actually been received and promoted.
 */
export const kvsGraphCxStore = {
  clearActiveGraphCxId: async (graphCxId) => {
    const activeGraphCxId = await kvs.get<string>(activeGraphCxKey);
    if (activeGraphCxId === graphCxId) {
      await kvs.delete(activeGraphCxKey);
    }
  },
  forget: async (graphCxId) => {
    await kvs.delete(storageKey(graphCxId));
  },
  getActiveGraphCxId: async () => kvs.get<string>(activeGraphCxKey),
  read: async (graphCxId) => {
    const stored = await kvs.get<SupplierReceiptState>(storageKey(graphCxId));

    return stored ?? emptySupplierReceiptState;
  },
  setActiveGraphCxId: async (graphCxId) => {
    await kvs.set(activeGraphCxKey, graphCxId);
  },
  write: async (graphCxId, state) => {
    await kvs.set(storageKey(graphCxId), state);
  },
} satisfies GraphCxStore & SupplierReceiptStateStore;
