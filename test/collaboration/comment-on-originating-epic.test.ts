import { ok, type Result } from "@forge-ahead/errors";
import { describe, expect, it } from "vitest";

import {
  type CurrentPackageStore,
  commentOnOriginatingEpic,
  type JiraCommentPort,
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

describe("commentOnOriginatingEpic", () => {
  it("posts an attributed package comment to the Source Epic resolved from provenance", async () => {
    const requests: unknown[] = [];
    const store: CurrentPackageStore = {
      read: async () => currentPackageState(),
    };
    const jira: JiraCommentPort = {
      createComment: async (request) => {
        requests.push(request);
        return ok({ commentId: "10001" });
      },
    };

    const result = expectOk(
      await commentOnOriginatingEpic(
        { jira, store },
        {
          commentText: "Please confirm the material tolerance before release.",
          connectionId: "connection-001",
        },
      ),
    );

    expect(result).toEqual({
      commentId: "10001",
      correlationId: "corr-publish-001",
      sourceEpicId: "MFG-17",
      version: "1",
    });
    expect(requests).toEqual([
      {
        body: "Supplychain Graph package comment\nSource package: MFG-17 · version 1 · pairing pairing-001\nSubmitted through the Supplychain Graph Rovo action.\n\nPlease confirm the material tolerance before release.",
        issueKey: "MFG-17",
      },
    ]);
  });

  it("rejects blank comment text without attempting a Jira write", async () => {
    const requests: unknown[] = [];
    const store: CurrentPackageStore = {
      read: async () => currentPackageState(),
    };
    const jira: JiraCommentPort = {
      createComment: async (request) => {
        requests.push(request);
        return ok({ commentId: "should-not-exist" });
      },
    };

    const result = await commentOnOriginatingEpic(
      { jira, store },
      { commentText: "   ", connectionId: "connection-001" },
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual({ code: "comment-text-required" });
    }
    expect(requests).toEqual([]);
  });

  it("returns an actionable failure and makes no Jira write without current package provenance", async () => {
    const requests: unknown[] = [];
    const store: CurrentPackageStore = {
      read: async () => ({
        currentPackage: undefined,
        pairings: [],
        processedIdempotencyKeys: [],
      }),
    };
    const jira: JiraCommentPort = {
      createComment: async (request) => {
        requests.push(request);
        return ok({ commentId: "should-not-exist" });
      },
    };

    const result = await commentOnOriginatingEpic(
      { jira, store },
      {
        commentText: "Please confirm the material tolerance before release.",
        connectionId: "connection-001",
      },
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "no-current-package",
        connectionId: "connection-001",
      });
    }
    expect(requests).toEqual([]);
  });
});
