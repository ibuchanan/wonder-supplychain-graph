import { describe, expect, it } from "vitest";

import type { Result } from "@forge-ahead/errors";

import { buildPackageProjection } from "../../src/projection/build-package-projection";
import {
  applySupplierReceiptCommand,
  type SupplierReceiptState,
} from "../../src/receipt/apply-command";

function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.isOk()).toBe(true);

  if (result.isErr()) {
    expect.unreachable(
      `Expected the supplier receipt to succeed, received ${JSON.stringify(result.error)}`,
    );
  }

  return result.value;
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

describe("buildPackageProjection", () => {
  it("indexes the current package with provenance and current-version metadata", () => {
    const projection = buildPackageProjection(activeSupplierState());

    expect(projection).toEqual({
      decision: "index",
      objects: [
        {
          description: "Approved supplier release package.",
          id: "pairing-001:MFG-17",
          issueKey: "MFG-17",
          issueType: "Epic",
          pairedEpicId: "SUP-42",
          priority: "High",
          provenance: {
            pairingId: "pairing-001",
            publisherId: "account:manufacturer-automation",
            sourceEpicId: "MFG-17",
            sourceSiteId: "site:manufacturer",
          },
          publishedAt: "2026-08-03T16:00:00.000Z",
          role: "source-epic",
          statusCategory: "In Progress",
          summary: "Supplier release package",
          version: "1",
        },
        {
          description: "Approve the material specification.",
          id: "pairing-001:MFG-18",
          issueKey: "MFG-18",
          issueType: "Task",
          pairedEpicId: "SUP-42",
          priority: "High",
          provenance: {
            pairingId: "pairing-001",
            publisherId: "account:manufacturer-automation",
            sourceEpicId: "MFG-17",
            sourceSiteId: "site:manufacturer",
          },
          publishedAt: "2026-08-03T16:00:00.000Z",
          role: "direct-child",
          statusCategory: "To Do",
          summary: "Source material approval",
          version: "1",
        },
      ],
    });
  });

  it("replaces a superseded version in place when a newer package is promoted", () => {
    const receipt = applySupplierReceiptCommand(activeSupplierState(), {
      authorization: "granted",
      correlationId: "corr-supplier-package-002",
      idempotencyKey: "supplier-receipt-002",
      operation: "snapshot.candidate.receive",
      peerInstallationId: "installation:manufacturer",
      protocolVersion: "v1",
      snapshot: {
        content: {
          children: [
            {
              description: "Prepare the manufacturing line for release.",
              issueType: "Task",
              key: "MFG-19",
              priority: "Medium",
              statusCategory: "In Progress",
              summary: "Manufacturing readiness",
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
        pairedEpicId: "SUP-42",
        pairingId: "pairing-001",
        publishedAt: "2026-08-04T16:00:00.000Z",
        publisherId: "account:manufacturer-automation",
        sourceEpicId: "MFG-17",
        sourceSiteId: "site:manufacturer",
        version: "2",
      },
    });

    const projection = buildPackageProjection(expectOk(receipt).nextState);

    expect(projection.decision).toBe("index");
    if (projection.decision === "suppress") {
      expect.unreachable("Expected the promoted package to be indexed");
    }
    // The Epic keeps its stable object ID, so the newer version updates in place.
    expect(projection.objects.map((object) => object.id)).toEqual([
      "pairing-001:MFG-17",
      "pairing-001:MFG-19",
    ]);
    expect(projection.objects.map((object) => object.version)).toEqual([
      "2",
      "2",
    ]);
    expect(projection.objects.map((object) => object.publishedAt)).toEqual([
      "2026-08-04T16:00:00.000Z",
      "2026-08-04T16:00:00.000Z",
    ]);
  });

  it("suppresses discovery while only a candidate has been received", () => {
    const projection = buildPackageProjection({
      ...activeSupplierState(),
      currentPackage: undefined,
    });

    expect(projection).toEqual({
      decision: "suppress",
      reason: "no-current-package",
    });
  });

  it("suppresses discovery when no local pairing binds the current package to its Paired Epic", () => {
    const projection = buildPackageProjection({
      ...activeSupplierState(),
      pairings: [],
    });

    expect(projection).toEqual({
      decision: "suppress",
      reason: "pairing-unavailable",
    });
  });
});
