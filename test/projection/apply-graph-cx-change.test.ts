import { describe, expect, it } from "vitest";

import {
  applyGraphCxChange,
  type GraphCxStore,
} from "../../src/graph-cx-management";
import type { PackageGraphPort } from "../../src/projection/ingest-package-projection";
import type { SupplierReceiptState } from "../../src/receipt/apply-command";

const activeSupplierState = (): SupplierReceiptState => ({
  currentPackage: {
    content: {
      children: [],
      epic: {
        description: "Approved supplier release package.",
        issueType: "Epic",
        key: "MFG-17",
        priority: "High",
        statusCategory: "In Progress",
        summary: "Supplier release package",
      },
    },
    correlationId: "corr-supplier-package-001",
    pairedEpicId: "SUP-42",
    pairingId: "pairing-001",
    publishedAt: "2026-08-03T16:00:00.000Z",
    publisherId: "account:manufacturer-automation",
    sourceEpicId: "MFG-17",
    sourceSiteId: "site:manufacturer",
    version: "1",
  },
  pairings: [
    {
      expectedPeerInstallationId: "installation:manufacturer",
      pairedEpicId: "SUP-42",
      pairingId: "pairing-001",
      sourceEpicId: "MFG-17",
      status: "active",
    },
  ],
  processedIdempotencyKeys: [],
});

function recordingDependencies() {
  const calls: string[] = [];
  const graph: PackageGraphPort = {
    deleteObjectsByProperties: async () => {
      calls.push("graph.deleteObjectsByProperties");
      return { success: true };
    },
    setObjects: async () => {
      calls.push("graph.setObjects");
      return { success: true };
    },
  };
  const store: GraphCxStore = {
    clearActiveGraphCxId: async () => {
      calls.push("store.clearActiveGraphCxId");
    },
    forget: async () => {
      calls.push("store.forget");
    },
    getActiveGraphCxId: async () => undefined,
    read: async () => {
      calls.push("store.read");
      return activeSupplierState();
    },
    setActiveGraphCxId: async () => {
      calls.push("store.setActiveGraphCxId");
    },
  };

  return { calls, graph, store };
}

describe("applyGraphCxChange", () => {
  it("indexes the current package when the connection is created", async () => {
    const { calls, graph, store } = recordingDependencies();

    const response = await applyGraphCxChange(
      { graph, store },
      {
        action: "CREATED",
        configProperties: {},
        graphCxId: "graph-cx-001",
        name: "scg-package-connector",
      },
    );

    expect(response).toEqual({
      message: "Indexed 1 current package object.",
      success: true,
    });
    expect(calls).toEqual([
      "store.setActiveGraphCxId",
      "store.read",
      "graph.setObjects",
    ]);
  });

  it("reports suppression without indexing when no authorized package exists", async () => {
    const { calls, graph, store } = recordingDependencies();

    const response = await applyGraphCxChange(
      {
        graph,
        store: {
          ...store,
          read: async () => ({
            ...activeSupplierState(),
            currentPackage: undefined,
          }),
        },
      },
      {
        action: "UPDATED",
        configProperties: {},
        graphCxId: "graph-cx-001",
        name: "scg-package-connector",
      },
    );

    expect(response).toEqual({
      message: "Suppressed discovery: no-current-package.",
      success: true,
    });
    expect(calls).toEqual(["store.setActiveGraphCxId"]);
  });

  it("forgets the stored connection when the connection is deleted", async () => {
    const { calls, graph, store } = recordingDependencies();

    const response = await applyGraphCxChange(
      { graph, store },
      {
        action: "DELETED",
        configProperties: {},
        graphCxId: "graph-cx-001",
        name: "scg-package-connector",
      },
    );

    expect(response).toEqual({
      message: "Forgot the connection.",
      success: true,
    });
    expect(calls).toEqual(["store.clearActiveGraphCxId", "store.forget"]);
  });
});
