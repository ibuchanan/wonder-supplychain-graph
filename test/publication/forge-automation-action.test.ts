import { fetch } from "@forge/api";
import { kvs } from "@forge/kvs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@forge/api", () => ({ fetch: vi.fn() }));
vi.mock("@forge/kvs", () => ({
  kvs: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

import { publishWorkPackage } from "../../src/publication/forge-automation-action";

describe("publishWorkPackage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T14:30:00.000Z"));
    vi.stubGlobal("crypto", { randomUUID: () => "execution-003" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("persists the queued candidate but fails visibly when no source pairing is configured", async () => {
    vi.mocked(kvs.get).mockResolvedValue(undefined);

    await expect(
      publishWorkPackage({
        publisherId: "account:automation-001",
        sourceEpicId: "MFG-17",
      }),
    ).rejects.toThrow("Unable to emit lean event: source pairing unavailable");

    expect(kvs.set).toHaveBeenCalledWith("demo-publication-state:MFG-17", {
      candidates: [
        {
          candidateId: "candidate:scg:MFG-17:execution-003",
          correlationId: "scg:execution-003",
          pairedEpicId: "demo-paired:MFG-17",
          pairingId: "demo-pairing:MFG-17",
          publisherId: "account:automation-001",
          sourceEpicId: "MFG-17",
          state: "queued",
        },
      ],
      pairings: [
        {
          automationConnectionUserId: "account:automation-001",
          pairedEpicId: "demo-paired:MFG-17",
          pairingId: "demo-pairing:MFG-17",
          sourceEpicId: "MFG-17",
          status: "active",
        },
      ],
      processedIdempotencyKeys: ["scg:MFG-17:execution-003"],
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts one lean event to the active source pairing after queueing", async () => {
    vi.mocked(kvs.get).mockImplementation(async (key) => {
      if (key === "demo-pairing-state") {
        return {
          pairings: [
            {
              pairingId: "pairing-001",
              peerDeliveryUrl: "https://green.example/legacy-delivery",
              peerEventUrl:
                "https://green.example/forge/webtrigger/receive-lean-event",
              role: "source",
              sourceEpicKey: "MFG-17",
              sourceSiteAri: "ari:cloud:jira::site/blue-site",
              sourceSiteUrl: "https://blue.example",
              status: "active",
            },
          ],
        } as never;
      }
      return undefined;
    });
    vi.mocked(fetch).mockResolvedValue({ ok: true } as never);

    await publishWorkPackage({
      publisherId: "account:automation-001",
      sourceEpicId: "MFG-17",
    });

    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      "https://green.example/forge/webtrigger/receive-lean-event",
      {
        body: JSON.stringify({
          data: {
            issueKey: "MFG-17",
            pairingId: "pairing-001",
            updatedFields: [],
          },
          datacontenttype: "application/json",
          id: "execution-003",
          source: "ari:cloud:jira::site/blue-site",
          specversion: "1.0",
          subject: "issue/MFG-17",
          time: "2026-08-05T14:30:00.000Z",
          type: "scg:work-package:queued",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
  });

  it("surfaces a Green rejection after queueing locally", async () => {
    vi.mocked(kvs.get).mockImplementation(async (key) =>
      key === "demo-pairing-state"
        ? ({
            pairings: [
              {
                pairingId: "pairing-001",
                peerDeliveryUrl: "https://green.example/legacy-delivery",
                peerEventUrl:
                  "https://green.example/forge/webtrigger/receive-lean-event",
                role: "source",
                sourceEpicKey: "MFG-17",
                sourceSiteAri: "ari:cloud:jira::site/blue-site",
                sourceSiteUrl: "https://blue.example",
                status: "active",
              },
            ],
          } as never)
        : undefined,
    );
    vi.mocked(fetch).mockResolvedValue({ ok: false } as never);

    await expect(
      publishWorkPackage({
        publisherId: "account:automation-001",
        sourceEpicId: "MFG-17",
      }),
    ).rejects.toThrow("Unable to emit lean event: peer rejected delivery");
    expect(kvs.set).toHaveBeenCalledOnce();
  });
});
