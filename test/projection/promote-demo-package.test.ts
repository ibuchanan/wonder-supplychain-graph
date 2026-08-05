import type { Result } from "@forge-ahead/errors";
import { describe, expect, it } from "vitest";

import {
  promoteDemoPackage,
  type SupplierReceiptStateStore,
} from "../../src/projection/promote-demo-package";
import type { SupplierReceiptState } from "../../src/receipt/apply-command";

const emptyState = (): SupplierReceiptState => ({
  currentPackage: undefined,
  pairings: [],
  processedIdempotencyKeys: [],
});

function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.isOk()).toBe(true);

  if (result.isErr()) {
    expect.unreachable(
      `Expected success, received ${JSON.stringify(result.error)}`,
    );
  }

  return result.value;
}

describe("promoteDemoPackage", () => {
  it("persists a current package with Source Epic provenance and direct-child context", async () => {
    const writes: SupplierReceiptState[] = [];
    const store: SupplierReceiptStateStore = {
      async read() {
        return emptyState();
      },
      async write(_connectionId, state) {
        writes.push(state);
      },
    };

    const result = expectOk(
      await promoteDemoPackage(
        { store },
        {
          connectionId: "connection-001",
          correlationId: "corr-publish-001",
          idempotencyKey: "automation-run-001",
          publishedAt: "2026-08-05T12:00:00.000Z",
          publisherId: "account:automation-001",
          sourceEpicId: "MFG-17",
        },
      ),
    );

    expect(result).toEqual({
      connectionId: "connection-001",
      outcome: "published",
      sourceEpicId: "MFG-17",
      version: "1",
    });
    expect(writes).toHaveLength(1);
    expect(writes[0]?.currentPackage).toMatchObject({
      correlationId: "corr-publish-001",
      publisherId: "account:automation-001",
      sourceEpicId: "MFG-17",
      version: "1",
      content: {
        epic: {
          issueType: "Epic",
          key: "MFG-17",
        },
        children: [
          expect.objectContaining({ issueType: "Task" }),
          expect.objectContaining({ issueType: "Task" }),
        ],
      },
    });
  });
});
