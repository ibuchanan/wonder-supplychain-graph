import type { Result } from "@forge-ahead/errors";
import { describe, expect, it } from "vitest";

import {
  type CurrentPackageStore,
  resolveOriginatingPackage,
} from "../../src/collaboration/comment-on-originating-epic";
import type { SupplierReceiptState } from "../../src/receipt/apply-command";

function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.isOk()).toBe(true);

  if (result.isErr()) {
    expect.unreachable(
      `Expected success, received ${JSON.stringify(result.error)}`,
    );
  }

  return result.value;
}

const currentPackageState = (): SupplierReceiptState => ({
  currentPackage: {
    content: {
      children: [],
      epic: {
        description: "Published component package.",
        issueType: "Epic",
        key: "MFG-17",
        priority: "High",
        statusCategory: "In Progress",
        summary: "Component package",
      },
    },
    correlationId: "corr-publish-001",
    pairedEpicId: "SUP-42",
    pairingId: "pairing-001",
    publishedAt: "2026-08-05T12:00:00.000Z",
    publisherId: "account:publisher-001",
    sourceEpicId: "MFG-17",
    sourceSiteId: "site:manufacturer",
    version: "1",
  },
  pairings: [
    {
      expectedPeerInstallationId: "demo:manufacturer",
      pairedEpicId: "SUP-42",
      pairingId: "pairing-001",
      sourceEpicId: "MFG-17",
      status: "active",
    },
  ],
  processedIdempotencyKeys: [],
});

describe("resolveOriginatingPackage", () => {
  it("returns the Source Epic only from current package provenance", async () => {
    const store: CurrentPackageStore = {
      read: async () => currentPackageState(),
    };

    const result = expectOk(
      await resolveOriginatingPackage(store, "connection-001"),
    );

    expect(result).toEqual({
      correlationId: "corr-publish-001",
      pairingId: "pairing-001",
      publishedAt: "2026-08-05T12:00:00.000Z",
      publisherId: "account:publisher-001",
      sourceEpicId: "MFG-17",
      version: "1",
    });
  });
});
