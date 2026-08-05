import { kvs } from "@forge/kvs";

import type { SupplierReceiptState } from "../receipt/apply-command";
import type { PackageConnectionStore } from "../cx-management";
import type { SupplierReceiptStateStore } from "./promote-demo-package";

const activeConnectionKey = "active-graph-connection-id";

const emptySupplierReceiptState: SupplierReceiptState = {
  currentPackage: undefined,
  pairings: [],
  processedIdempotencyKeys: [],
};

function storageKey(connectionId: string): string {
  return `supplier-receipt-state:${connectionId}`;
}

/**
 * Tenant-local, app-scoped storage for the supplier receipt state a Teamwork
 * Graph connection projects. An unknown connection reads as empty so discovery
 * stays suppressed until a package has actually been received and promoted.
 */
export const kvsPackageConnectionStore = {
  clearActiveConnectionId: async (connectionId) => {
    const activeConnectionId = await kvs.get<string>(activeConnectionKey);
    if (activeConnectionId === connectionId) {
      await kvs.delete(activeConnectionKey);
    }
  },
  forget: async (connectionId) => {
    await kvs.delete(storageKey(connectionId));
  },
  getActiveConnectionId: async () => kvs.get<string>(activeConnectionKey),
  read: async (connectionId) => {
    const stored = await kvs.get<SupplierReceiptState>(
      storageKey(connectionId),
    );

    return stored ?? emptySupplierReceiptState;
  },
  setActiveConnectionId: async (connectionId) => {
    await kvs.set(activeConnectionKey, connectionId);
  },
  write: async (connectionId, state) => {
    await kvs.set(storageKey(connectionId), state);
  },
} satisfies PackageConnectionStore & SupplierReceiptStateStore;
