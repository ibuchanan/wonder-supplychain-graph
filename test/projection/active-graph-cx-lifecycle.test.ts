import { describe, expect, it } from "vitest";

import { applyGraphCxChange } from "../../src/graph-cx-management";
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
      clearActiveGraphCxId: async () => {
        calls.push("clear-active");
      },
      forget: async () => {
        calls.push("forget");
      },
      getActiveGraphCxId: async () => undefined,
      read: async () => {
        calls.push("read");
        return emptyState;
      },
      setActiveGraphCxId: async (graphCxId: string) => {
        calls.push(`activate:${graphCxId}`);
      },
    };

    await applyGraphCxChange(
      { graph, store },
      {
        action: "CREATED",
        configProperties: {},
        graphCxId: "graph-cx-001",
        name: "Supplychain Graph Package",
      },
    );

    expect(calls).toEqual(["activate:graph-cx-001", "read"]);
  });
});
