import { describe, expect, it } from "vitest";

import { readStarterDeliveryHarnessConfig } from "../../src/harness/read-starter-delivery-harness-config";

describe("readStarterDeliveryHarnessConfig", () => {
  it("maps all harness inputs from local environment variables", () => {
    const result = readStarterDeliveryHarnessConfig({
      SCG_DESTINATION_AUTOMATION_WEBHOOK_URL: "destination-automation-webhook",
      SCG_DESTINATION_DELIVERY_URL: "destination-delivery",
      SCG_DESTINATION_EVENT_URL: "destination-event",
      SCG_DESTINATION_SEED_URL: "destination-seed",
      SCG_DESTINATION_SITE: "destination-example.atlassian.net",
      SCG_PAIRED_EPIC_KEY: "SUP-42",
      SCG_PAIRING_ID: "pairing-001",
      SCG_SOURCE_EPIC_KEY: "MFG-17",
      SCG_SOURCE_SITE: "source-example.atlassian.net",
      SCG_SOURCE_PUBLICATION_URL: "source-publication",
      SCG_SOURCE_SITE_ARI: "ari:cloud:jira::site/source-001",
      SCG_SOURCE_SEED_URL: "source-seed",
    });

    expect(result).toMatchObject({
      value: {
        destinationAutomationWebhookUrl: "destination-automation-webhook",
        destinationDeliveryUrl: "destination-delivery",
        destinationEventUrl: "destination-event",
        destinationSeedUrl: "destination-seed",
        destinationSite: "destination-example.atlassian.net",
        pairedEpicKey: "SUP-42",
        pairingId: "pairing-001",
        sourceEpicKey: "MFG-17",
        sourcePublicationUrl: "source-publication",
        sourceSiteAri: "ari:cloud:jira::site/source-001",
        sourceSiteUrl: "https://source-example.atlassian.net",
        sourceSeedUrl: "source-seed",
      },
    });
  });

  it("reports every missing value without applying defaults", () => {
    const result = readStarterDeliveryHarnessConfig({});

    expect(result).toMatchObject({
      error: {
        code: "missing-harness-environment",
        names: [
          "SCG_DESTINATION_AUTOMATION_WEBHOOK_URL",
          "SCG_DESTINATION_DELIVERY_URL",
          "SCG_DESTINATION_EVENT_URL",
          "SCG_DESTINATION_SEED_URL",
          "SCG_DESTINATION_SITE",
          "SCG_PAIRED_EPIC_KEY",
          "SCG_PAIRING_ID",
          "SCG_SOURCE_EPIC_KEY",
          "SCG_SOURCE_PUBLICATION_URL",
          "SCG_SOURCE_SITE_ARI",
          "SCG_SOURCE_SITE",
          "SCG_SOURCE_SEED_URL",
        ],
      },
    });
  });
});
