import { describe, expect, it, vi } from "vitest";

import {
  runStarterDeliveryHarness,
  type StarterDeliveryHarnessConfig,
} from "../../src/harness/run-starter-delivery-harness";

const config: StarterDeliveryHarnessConfig = {
  destinationDeliveryUrl: "destination-delivery",
  destinationSeedUrl: "destination-seed",
  pairedEpicKey: "SUP-42",
  pairingId: "pairing-001",
  sourceEpicKey: "MFG-17",
  sourcePublicationUrl: "source-publication",
  sourceSeedUrl: "source-seed",
};

function response(status: number, body: unknown) {
  const text = JSON.stringify(body);
  return {
    json: async () => body,
    status,
    text: async () => text,
  };
}

describe("runStarterDeliveryHarness", () => {
  it("seeds destination then source, publishes once, and returns safe delivery evidence", async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce(response(200, { status: "active" }))
      .mockResolvedValueOnce(response(200, { status: "active" }))
      .mockResolvedValueOnce(
        response(200, {
          correlationId: "corr-001",
          documentId: "pairing-001:10017",
          objectCount: 1,
          outcome: "delivered",
          sourceEpicKey: "MFG-17",
          updateSequence: 1_786_129_200_000,
        }),
      );

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
      pairedEpicKey: "SUP-42",
      pairingId: "pairing-001",
      role: "destination",
      sourceEpicKey: "MFG-17",
    });
    expect(post).toHaveBeenNthCalledWith(2, "source-seed", {
      pairingId: "pairing-001",
      peerDeliveryUrl: "destination-delivery",
      role: "source",
      sourceEpicKey: "MFG-17",
    });
    expect(post).toHaveBeenNthCalledWith(3, "source-publication", {
      pairingId: "pairing-001",
    });
  });

  it("returns the destination error detail and stops before source seeding", async () => {
    const post = vi
      .fn()
      .mockResolvedValue(
        response(424, { error: "webtrigger-invocation-failed" }),
      );

    const result = await runStarterDeliveryHarness(config, { post });

    expect(result).toMatchObject({
      error: {
        code: "request-failed",
        detail: "webtrigger-invocation-failed",
        status: 424,
        step: "destination-seed",
      },
    });
    expect(post).toHaveBeenCalledExactlyOnceWith("destination-seed", {
      pairedEpicKey: "SUP-42",
      pairingId: "pairing-001",
      role: "destination",
      sourceEpicKey: "MFG-17",
    });
  });
});
