import { kvs } from "@forge/kvs";

import type { SupplierReceiptState } from "../receipt/apply-command";
import type { PackageConnectionStore } from "./apply-connection-change";

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
export const kvsPackageConnectionStore: PackageConnectionStore = {
  forget: async (connectionId) => {
    await kvs.delete(storageKey(connectionId));
  },
  read: async (connectionId) => {
    const stored = await kvs.get<SupplierReceiptState>(
      storageKey(connectionId),
    );

    return stored ?? emptySupplierReceiptState;
  },
};
