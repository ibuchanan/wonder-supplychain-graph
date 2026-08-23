import { kvs } from "@forge/kvs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@forge/kvs", () => ({
  kvs: { get: vi.fn(), set: vi.fn() },
}));

vi.mock("@forge-ahead/triggers/webtrigger", () => ({
  buildSuccessResponse: (body: unknown) => ({
    body: JSON.stringify(body),
    headers: { "Content-Type": ["application/json"] },
    statusCode: 200,
  }),
  defineWebTrigger: (handler: unknown) => handler,
}));

const { info } = vi.hoisted(() => ({ info: vi.fn() }));
vi.mock("../../src/logging", () => ({ logger: { info } }));

import {
  seedDestinationPairing,
  seedSourcePairing,
} from "../../src/pairing/forge-demo-pairing-seed";

describe("demo pairing seed webtriggers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(kvs.get).mockResolvedValue({ pairings: [] } as never);
  });

  it("returns and logs identifiers without either capability URL", async () => {
    vi.mocked(kvs.get).mockImplementation(async (key) =>
      key === "active-graph-connection-id"
        ? ("connection-001" as never)
        : ({ pairings: [] } as never),
    );

    const sourceResponse = await seedSourcePairing({
      body: JSON.stringify({
        pairingId: "pairing-001",
        peerDeliveryUrl: "https://green.example/starter-delivery",
        peerEventUrl:
          "https://green.example/lean-event?token=source-capability",
        role: "source",
        sourceEpicKey: "MFG-17",
        sourceSiteAri: "ari:cloud:jira::site/source-001",
        sourceSiteUrl: "https://source-example.atlassian.net",
      }),
    });
    const destinationResponse = await seedDestinationPairing({
      body: JSON.stringify({
        automationWebhookUrl:
          "https://automation.example/webhook?token=destination-capability",
        pairedEpicKey: "SUP-42",
        pairingId: "pairing-001",
        role: "destination",
        sourceEpicKey: "MFG-17",
      }),
    });

    const externallyVisible = JSON.stringify({
      destinationResponse,
      logs: info.mock.calls,
      sourceResponse,
    });
    expect(externallyVisible).not.toContain("source-capability");
    expect(externallyVisible).not.toContain("destination-capability");
  });
});
