import { describe, expect, it } from "vitest";

import { readLeanEventDemoConfig } from "../../src/harness/read-lean-event-demo-config";

describe("readLeanEventDemoConfig", () => {
  it("reads the local values needed to seed the POC without defaulting capability URLs", () => {
    const result = readLeanEventDemoConfig({
      SCG_DESTINATION_AUTOMATION_WEBHOOK_URL: "destination-automation-webhook",
      SCG_DESTINATION_DELIVERY_URL: "destination-delivery",
      SCG_DESTINATION_EVENT_URL: "destination-event",
      SCG_DESTINATION_SEED_URL: "destination-seed",
      SCG_PAIRED_EPIC_KEY: "GREEN-42",
      SCG_PAIRING_ID: "pairing-001",
      SCG_SOURCE_EPIC_KEY: "BLUE-17",
      SCG_SOURCE_SEED_URL: "source-seed",
      SCG_SOURCE_SITE: "blue-example.atlassian.net",
      SCG_SOURCE_SITE_ARI: "ari:cloud:jira::site/blue-001",
    });

    expect(result).toEqual({
      value: {
        destinationAutomationWebhookUrl: "destination-automation-webhook",
        destinationDeliveryUrl: "destination-delivery",
        destinationEventUrl: "destination-event",
        destinationSeedUrl: "destination-seed",
        pairedEpicKey: "GREEN-42",
        pairingId: "pairing-001",
        sourceEpicKey: "BLUE-17",
        sourceSeedUrl: "source-seed",
        sourceSiteAri: "ari:cloud:jira::site/blue-001",
        sourceSiteUrl: "https://blue-example.atlassian.net",
      },
    });
  });
});
