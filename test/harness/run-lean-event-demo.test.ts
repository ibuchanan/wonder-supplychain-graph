import { describe, expect, it, vi } from "vitest";

import {
  runLeanEventDemo,
  type LeanEventDemoConfig,
} from "../../src/harness/run-lean-event-demo";

const config: LeanEventDemoConfig = {
  destinationAutomationWebhookUrl: "destination-automation-webhook",
  destinationDeliveryUrl: "destination-delivery",
  destinationSeedUrl: "destination-seed",
  pairedEpicKey: "GREEN-42",
  pairingId: "pairing-001",
  sourceEpicKey: "BLUE-17",
  sourceSeedUrl: "source-seed",
  sourceSiteAri: "ari:cloud:jira::site/blue-001",
  sourceSiteUrl: "https://blue-example.atlassian.net",
  destinationEventUrl: "destination-event",
};

function response(status: number, body: unknown) {
  const text = JSON.stringify(body);
  return {
    status,
    text: async () => text,
  };
}

describe("runLeanEventDemo", () => {
  it("seeds Green then Blue and returns safe manual-action evidence", async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce(response(200, { status: "active" }))
      .mockResolvedValueOnce(response(200, { status: "active" }));

    const result = await runLeanEventDemo(config, { post });

    expect(result).toEqual({
      value: {
        nextStep:
          "Run the Blue Publish work package Automation Action for BLUE-17.",
        outcome: "ready-for-blue-automation-action",
        pairedEpicKey: "GREEN-42",
        sourceEpicKey: "BLUE-17",
      },
    });
    expect(post).toHaveBeenNthCalledWith(1, "destination-seed", {
      automationWebhookUrl: "destination-automation-webhook",
      pairedEpicKey: "GREEN-42",
      pairingId: "pairing-001",
      role: "destination",
      sourceEpicKey: "BLUE-17",
    });
    expect(post).toHaveBeenNthCalledWith(2, "source-seed", {
      pairingId: "pairing-001",
      peerDeliveryUrl: "destination-delivery",
      peerEventUrl: "destination-event",
      role: "source",
      sourceEpicKey: "BLUE-17",
      sourceSiteAri: "ari:cloud:jira::site/blue-001",
      sourceSiteUrl: "https://blue-example.atlassian.net",
    });
  });
});
