import { describe, expect, it } from "vitest";

import { onConfigChange } from "../../src/cx-management";
import type { PackageGraphPort } from "../../src/projection/ingest-package-projection";
import type { SupplierReceiptState } from "../../src/receipt/apply-command";

const emptyState: SupplierReceiptState = {
  currentPackage: undefined,
  pairings: [],
  processedIdempotencyKeys: [],
};

describe("active graph connection lifecycle", () => {
  it("records a created platform connection as the active connection before discovery", async () => {
    const calls: string[] = [];
    const graph: PackageGraphPort = {
      deleteObjectsByProperties: async () => ({ success: true }),
      setObjects: async () => ({ success: true }),
    };
    const store = {
      clearActiveConnectionId: async () => {
        calls.push("clear-active");
      },
      forget: async () => {
        calls.push("forget");
      },
      getActiveConnectionId: async () => undefined,
      read: async () => {
        calls.push("read");
        return emptyState;
      },
      setActiveConnectionId: async (connectionId: string) => {
        calls.push(`activate:${connectionId}`);
      },
    };

    await onConfigChange(
      { graph, store },
      {
        action: "CREATED",
        configProperties: {},
        connectionId: "connection-001",
        name: "Supplychain Graph Package",
      },
    );

    expect(calls).toEqual(["activate:connection-001", "read"]);
  });
});
