import { describe, expect, it } from "vitest";

import { readStarterDeliveryHarnessConfig } from "../../src/harness/read-starter-delivery-harness-config";

describe("readStarterDeliveryHarnessConfig", () => {
  it("maps all harness inputs from local environment variables", () => {
    const result = readStarterDeliveryHarnessConfig({
      SCG_DESTINATION_DELIVERY_URL: "destination-delivery",
      SCG_DESTINATION_SEED_URL: "destination-seed",
      SCG_PAIRED_EPIC_KEY: "SUP-42",
      SCG_PAIRING_ID: "pairing-001",
      SCG_SOURCE_EPIC_KEY: "MFG-17",
      SCG_SOURCE_PUBLICATION_URL: "source-publication",
      SCG_SOURCE_SEED_URL: "source-seed",
    });

    expect(result).toMatchObject({
      value: {
        destinationDeliveryUrl: "destination-delivery",
        destinationSeedUrl: "destination-seed",
        pairedEpicKey: "SUP-42",
        pairingId: "pairing-001",
        sourceEpicKey: "MFG-17",
        sourcePublicationUrl: "source-publication",
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
          "SCG_DESTINATION_DELIVERY_URL",
          "SCG_DESTINATION_SEED_URL",
          "SCG_PAIRED_EPIC_KEY",
          "SCG_PAIRING_ID",
          "SCG_SOURCE_EPIC_KEY",
          "SCG_SOURCE_PUBLICATION_URL",
          "SCG_SOURCE_SEED_URL",
        ],
      },
    });
  });
});
