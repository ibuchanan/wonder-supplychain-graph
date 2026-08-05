import { describe, expect, it } from "vitest";

import {
  ingestPackageProjection,
  type PackageGraphPort,
} from "../../src/projection/ingest-package-projection";
import type { SupplierReceiptState } from "../../src/receipt/apply-command";

function recordingGraph(): PackageGraphPort & {
  readonly deleted: unknown[];
  readonly set: unknown[];
} {
  const set: unknown[] = [];
  const deleted: unknown[] = [];

  return {
    deleted,
    deleteObjectsByProperties: async (request) => {
      deleted.push(request);
      return { success: true };
    },
    set,
    setObjects: async (request) => {
      set.push(request);
      return { success: true };
    },
  };
}

const activeSupplierState = (): SupplierReceiptState => ({
  currentPackage: {
    content: {
      children: [
        {
          description: "Approve the material specification.",
          issueType: "Task",
          key: "MFG-18",
          priority: "High",
          statusCategory: "To Do",
          summary: "Source material approval",
        },
      ],
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

describe("ingestPackageProjection", () => {
  it("sets one work item per current package object with provenance properties", async () => {
    const graph = recordingGraph();

    const outcome = await ingestPackageProjection(graph, {
      connectionId: "connection-001",
      state: activeSupplierState(),
    });

    expect(outcome).toEqual({ ingested: 2, outcome: "indexed" });
    expect(graph.deleted).toEqual([]);
    expect(graph.set).toHaveLength(1);

    const request = graph.set[0] as {
      connectionId: string;
      objects: {
        description: string;
        displayName: string;
        id: string;
        "atlassian:work-item": { status: string; subtype: string };
      }[];
      properties?: Record<string, string>;
    };

    expect(request.connectionId).toBe("connection-001");
    expect(request.properties).toEqual({ pairingId: "pairing-001" });
    expect(request.objects.map((object) => object.id)).toEqual([
      "pairing-001:MFG-17",
      "pairing-001:MFG-18",
    ]);
    expect(request.objects[0].displayName).toBe("Supplier release package");
    expect(request.objects[0].description).toBe(
      "Approved supplier release package.",
    );
    expect(request.objects[0]["atlassian:work-item"]).toEqual({
      status: "In Progress",
      subtype: "epic",
    });
    expect(request.objects[1]["atlassian:work-item"]).toEqual({
      status: "To Do",
      subtype: "task",
    });
  });

  it("removes every indexed object for the pairing when the projection is suppressed", async () => {
    const graph = recordingGraph();

    const outcome = await ingestPackageProjection(graph, {
      connectionId: "connection-001",
      state: { ...activeSupplierState(), pairings: [] },
    });

    expect(outcome).toEqual({
      outcome: "suppressed",
      reason: "pairing-unavailable",
    });
    expect(graph.set).toEqual([]);
    expect(graph.deleted).toEqual([
      {
        connectionId: "connection-001",
        objectType: "atlassian:work-item",
        properties: { pairingId: "pairing-001" },
      },
    ]);
  });
});
