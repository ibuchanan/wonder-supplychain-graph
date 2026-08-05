import api, { route } from "@forge/api";
import { kvs } from "@forge/kvs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@forge/api", () => ({
  default: {
    asUser: vi.fn(),
  },
  route: (parts: TemplateStringsArray, ...values: unknown[]) =>
    parts.reduce(
      (path, part, index) => `${path}${part}${values[index] ?? ""}`,
      "",
    ),
}));

vi.mock("@forge/kvs", () => ({
  kvs: {
    get: vi.fn(),
  },
}));

import { commentOnOriginatingEpicFromRovo } from "../../src/collaboration/forge-rovo-comment-action";

describe("commentOnOriginatingEpicFromRovo", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(kvs.get).mockResolvedValue({
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
  });

  it("creates an as-user Jira comment on the Source Epic and returns a Rovo confirmation", async () => {
    const requestJira = vi.fn().mockResolvedValue({
      json: async () => ({ id: "10001" }),
      ok: true,
    });
    vi.mocked(api.asUser).mockReturnValue({ requestJira } as never);

    await expect(
      commentOnOriginatingEpicFromRovo({
        commentText: "Please confirm the material tolerance before release.",
        connectionId: "connection-001",
      }),
    ).resolves.toEqual({
      output:
        "Added Supplychain Graph package comment to MFG-17 (comment 10001; package version 1).",
    });

    expect(route`/rest/api/3/issue/${"MFG-17"}/comment`).toBe(
      "/rest/api/3/issue/MFG-17/comment",
    );
    expect(requestJira).toHaveBeenCalledWith(
      "/rest/api/3/issue/MFG-17/comment",
      expect.objectContaining({
        body: JSON.stringify({
          body: {
            content: [
              {
                content: [
                  {
                    text: "Supplychain Graph package comment\nSource package: MFG-17 · version 1 · pairing pairing-001\nSubmitted through the Supplychain Graph Rovo action.\n\nPlease confirm the material tolerance before release.",
                    type: "text",
                  },
                ],
                type: "paragraph",
              },
            ],
            type: "doc",
            version: 1,
          },
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );
  });
});
