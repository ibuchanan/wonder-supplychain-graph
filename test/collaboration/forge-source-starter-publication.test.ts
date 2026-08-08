import api, { fetch } from "@forge/api";
import { kvs } from "@forge/kvs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@forge/api", () => ({
  default: { asApp: vi.fn() },
  fetch: vi.fn(),
  route: (parts: TemplateStringsArray, ...values: unknown[]) =>
    parts.reduce(
      (path, part, index) => `${path}${part}${values[index] ?? ""}`,
      "",
    ),
}));

vi.mock("@forge/kvs", () => ({
  kvs: { get: vi.fn() },
}));

import { publishStarterDelivery } from "../../src/collaboration/forge-source-starter-publication";

describe("publishStarterDelivery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(kvs.get).mockResolvedValue({
      pairings: [
        {
          pairingId: "pairing-001",
          peerDeliveryUrl:
            "https://tenant-id.webtrigger.atlassian.app/api/source-delivery",
          role: "source",
          sourceEpicId: "MFG-17",
          status: "active",
        },
      ],
    } as never);
  });

  it("reads only the paired Source Epic fields as the app and directly sends its starter document to the peer", async () => {
    const requestJira = vi.fn().mockResolvedValue({
      json: async () => ({
        fields: {
          created: "2026-08-01T12:00:00.000Z",
          summary: "Approve material source",
          updated: "2026-08-07T19:00:00.000Z",
        },
        id: "10017",
        key: "MFG-17",
        self: "https://tenant-id.atlassian.net/rest/api/3/issue/10017",
      }),
      ok: true,
    });
    vi.mocked(api.asApp).mockReturnValue({ requestJira } as never);
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        correlationId: "corr-001",
        documentId: "pairing-001:10017",
        objectCount: 1,
        outcome: "accepted",
        updateSequence: Date.parse("2026-08-07T19:00:00.000Z"),
      }),
      ok: true,
    } as never);

    const response = await publishStarterDelivery({
      body: JSON.stringify({ pairingId: "pairing-001" }),
    });

    expect(response.statusCode).toBe(200);
    expect(requestJira).toHaveBeenCalledExactlyOnceWith(
      "/rest/api/3/issue/MFG-17?fields=id,key,summary,created,updated",
    );
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      "https://tenant-id.webtrigger.atlassian.app/api/source-delivery",
      expect.objectContaining({
        body: expect.any(String),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );

    const forwarded = JSON.parse(
      vi.mocked(fetch).mock.calls[0]?.[1]?.body as string,
    );
    expect(forwarded).toEqual({
      correlationId: expect.any(String),
      pairingId: "pairing-001",
      protocolVersion: "v1",
      sourceEpic: {
        createdAt: "2026-08-01T12:00:00.000Z",
        id: "10017",
        key: "MFG-17",
        summary: "Approve material source",
        updatedAt: "2026-08-07T19:00:00.000Z",
        url: "https://tenant-id.atlassian.net/browse/MFG-17",
      },
    });
    expect(JSON.parse(response.body)).toEqual({
      correlationId: forwarded.correlationId,
      documentId: "pairing-001:10017",
      objectCount: 1,
      outcome: "delivered",
      sourceEpicKey: "MFG-17",
      updateSequence: Date.parse("2026-08-07T19:00:00.000Z"),
    });
  });
});
