import type { Result } from "@forge-ahead/errors";
import { describe, expect, it } from "vitest";

import {
  applyDemoPairingSeed,
  type DemoPairingState,
} from "../../src/pairing/apply-demo-pairing-seed";

function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.isOk()).toBe(true);
  if (result.isErr()) {
    throw new Error(
      `Expected success, received ${JSON.stringify(result.error)}`,
    );
  }

  return result.value;
}

describe("applyDemoPairingSeed", () => {
  it("creates the active source Pairing with its peer delivery endpoint", () => {
    const state: DemoPairingState = { pairings: [] };

    const result = expectOk(
      applyDemoPairingSeed(state, {
        pairingId: "demo-pairing-001",
        peerDeliveryUrl: "https://supplier.example/forge/webtrigger/deliver",
        role: "source",
        sourceEpicId: "MFG-17",
      }),
    );

    expect(result.nextState).toEqual({
      pairings: [
        {
          pairingId: "demo-pairing-001",
          peerDeliveryUrl: "https://supplier.example/forge/webtrigger/deliver",
          role: "source",
          sourceEpicId: "MFG-17",
          status: "active",
        },
      ],
    });
  });

  it("idempotently replaces the matching source Pairing", () => {
    const result = expectOk(
      applyDemoPairingSeed(
        {
          pairings: [
            {
              pairingId: "demo-pairing-001",
              peerDeliveryUrl:
                "https://old-supplier.example/forge/webtrigger/deliver",
              role: "source",
              sourceEpicId: "MFG-16",
              status: "active",
            },
          ],
        },
        {
          pairingId: "demo-pairing-001",
          peerDeliveryUrl: "https://supplier.example/forge/webtrigger/deliver",
          role: "source",
          sourceEpicId: "MFG-17",
        },
      ),
    );

    expect(result.nextState.pairings).toEqual([
      {
        pairingId: "demo-pairing-001",
        peerDeliveryUrl: "https://supplier.example/forge/webtrigger/deliver",
        role: "source",
        sourceEpicId: "MFG-17",
        status: "active",
      },
    ]);
  });

  it("rejects a destination seed when no active graph connection exists", () => {
    const result = applyDemoPairingSeed(
      { pairings: [] },
      {
        pairedEpicId: "SUP-42",
        pairingId: "demo-pairing-001",
        role: "destination",
        sourceEpicId: "MFG-17",
      },
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable(
        "Expected a destination without a graph connection to fail",
      );
    }
    expect(result.error).toEqual({
      code: "destination-connection-unavailable",
    });
  });

  it("binds the active destination Pairing to the active graph connection", () => {
    const result = expectOk(
      applyDemoPairingSeed(
        { activeConnectionId: "connection-001", pairings: [] },
        {
          pairedEpicId: "SUP-42",
          pairingId: "demo-pairing-001",
          role: "destination",
          sourceEpicId: "MFG-17",
        },
      ),
    );

    expect(result.nextState.pairings).toEqual([
      {
        connectionId: "connection-001",
        pairedEpicId: "SUP-42",
        pairingId: "demo-pairing-001",
        role: "destination",
        sourceEpicId: "MFG-17",
        status: "active",
      },
    ]);
  });
});
