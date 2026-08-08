import { describe, expect, it, vi } from "vitest";

import {
  runStarterDeliveryHarness,
  type StarterDeliveryHarnessConfig,
} from "../../src/harness/run-starter-delivery-harness";

describe("runStarterDeliveryHarness", () => {
  it("seeds destination then source, publishes once, and returns safe delivery evidence", async () => {
    const config: StarterDeliveryHarnessConfig = {
      destinationDeliveryUrl: "destination-delivery",
      destinationSeedUrl: "destination-seed",
      pairedEpicId: "SUP-42",
      pairingId: "pairing-001",
      sourceEpicId: "MFG-17",
      sourcePublicationUrl: "source-publication",
      sourceSeedUrl: "source-seed",
    };
    const post = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ status: "active" }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ status: "active" }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          correlationId: "corr-001",
          documentId: "pairing-001:10017",
          objectCount: 1,
          outcome: "delivered",
          sourceEpicKey: "MFG-17",
          updateSequence: 1_786_129_200_000,
        }),
      });

    const result = await runStarterDeliveryHarness(config, { post });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      return;
    }
    expect(result.value).toEqual({
      correlationId: "corr-001",
      documentId: "pairing-001:10017",
      objectCount: 1,
      outcome: "delivered",
      sourceEpicKey: "MFG-17",
      updateSequence: 1_786_129_200_000,
    });
    expect(post).toHaveBeenNthCalledWith(1, "destination-seed", {
      pairedEpicId: "SUP-42",
      pairingId: "pairing-001",
      role: "destination",
      sourceEpicId: "MFG-17",
    });
    expect(post).toHaveBeenNthCalledWith(2, "source-seed", {
      pairingId: "pairing-001",
      peerDeliveryUrl: "destination-delivery",
      role: "source",
      sourceEpicId: "MFG-17",
    });
    expect(post).toHaveBeenNthCalledWith(3, "source-publication", {
      pairingId: "pairing-001",
    });
  });
});
