import { describe, expect, it } from "vitest";

import { determineLocalReadiness } from "../../src/pairing/local-readiness";

describe("determineLocalReadiness", () => {
  it("reports unconfigured when the tenant has no configured local role", () => {
    expect(determineLocalReadiness({ pairings: [] })).toEqual({
      status: "unconfigured",
    });
  });

  it("reports waiting for pairing for a configured source without an active Pairing", () => {
    expect(determineLocalReadiness({ pairings: [], role: "source" })).toEqual({
      status: "waiting-for-pairing",
    });
  });

  it("reports ready for a source Pairing with a local peer delivery endpoint", () => {
    expect(
      determineLocalReadiness({
        pairings: [
          {
            pairingId: "demo-pairing-001",
            peerDeliveryUrl:
              "https://supplier.example/forge/webtrigger/deliver",
            role: "source",
            sourceEpicKey: "MFG-17",
            status: "active",
          },
        ],
        role: "source",
      }),
    ).toEqual({ status: "ready" });
  });

  it("reports waiting for pairing for a destination with a connection but no local Pairing", () => {
    expect(
      determineLocalReadiness({
        activeConnectionId: "connection-001",
        pairings: [],
        role: "destination",
      }),
    ).toEqual({ status: "waiting-for-pairing" });
  });

  it("reports ready for a destination Pairing bound to its active graph connection", () => {
    expect(
      determineLocalReadiness({
        activeConnectionId: "connection-001",
        pairings: [
          {
            connectionId: "connection-001",
            pairedEpicKey: "SUP-42",
            pairingId: "demo-pairing-001",
            role: "destination",
            sourceEpicKey: "MFG-17",
            status: "active",
          },
        ],
        role: "destination",
      }),
    ).toEqual({ status: "ready" });
  });

  it("reports a safe failed state without exposing operational details", () => {
    expect(
      determineLocalReadiness({
        failure: { code: "seed-write-failed" },
        pairings: [],
        role: "source",
      }),
    ).toEqual({ status: "failed" });
  });
});
