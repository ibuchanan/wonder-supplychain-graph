import type { Result } from "@forge-ahead/errors";

import {
  acceptStarterDelivery,
  prepareStarterPublication,
  type DestinationDeliveryState,
  type SourcePublicationState,
} from "../../src/collaboration/starter-peer-delivery-contract";

function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.isOk()).toBe(true);

  if (result.isErr()) {
    expect.unreachable(
      `Expected success, received ${JSON.stringify(result.error)}`,
    );
  }

  return result.value;
}

const activeSourceState = (): SourcePublicationState => ({
  pairings: [
    {
      pairingId: "pairing-001",
      sourceEpicId: "MFG-17",
      status: "active",
    },
  ],
});

describe("prepareStarterPublication", () => {
  it("derives the only publishable Source Epic from the active local Pairing", () => {
    const result = expectOk(
      prepareStarterPublication(activeSourceState(), {
        pairingId: "pairing-001",
      }),
    );

    expect(result).toEqual({
      pairingId: "pairing-001",
      sourceEpicId: "MFG-17",
    });
  });

  it("returns a safe error when the matching local Pairing is inactive", () => {
    const result = prepareStarterPublication(
      {
        pairings: [
          {
            pairingId: "pairing-001",
            sourceEpicId: "MFG-17",
            status: "inactive",
          },
        ],
      },
      { pairingId: "pairing-001" },
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an inactive Pairing to block publication");
    }
    expect(result.error).toEqual({
      code: "source-pairing-unavailable",
      pairingId: "pairing-001",
    });
  });
});

const readyDestinationState = (): DestinationDeliveryState => ({
  connectionId: "connection-001",
  pairings: [
    {
      pairingId: "pairing-001",
      sourceEpicId: "MFG-17",
      status: "active",
    },
  ],
});

describe("acceptStarterDelivery", () => {
  it("accepts a matching delivery as one stable, source-versioned starter document", () => {
    const result = expectOk(
      acceptStarterDelivery(readyDestinationState(), {
        correlationId: "corr-001",
        pairingId: "pairing-001",
        protocolVersion: "v1",
        sourceEpic: {
          id: "10017",
          key: "MFG-17",
          summary: "Approve material source",
          updatedAt: "2026-08-07T19:00:00.000Z",
          url: "https://manufacturer.example/browse/MFG-17",
        },
      }),
    );

    expect(result).toEqual({
      connectionId: "connection-001",
      correlationId: "corr-001",
      document: {
        content: "MFG-17: Approve material source",
        displayName: "MFG-17: Approve material source",
        id: "pairing-001:10017",
        updateSequence: Date.parse("2026-08-07T19:00:00.000Z"),
        url: "https://manufacturer.example/browse/MFG-17",
      },
      outcome: "accepted",
    });
  });

  it("returns a safe error when the payload has no usable source update time", () => {
    const result = acceptStarterDelivery(readyDestinationState(), {
      correlationId: "corr-001",
      pairingId: "pairing-001",
      protocolVersion: "v1",
      sourceEpic: {
        id: "10017",
        key: "MFG-17",
        summary: "Approve material source",
        updatedAt: "not-a-date",
        url: "https://manufacturer.example/browse/MFG-17",
      },
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable(
        "Expected an invalid source update time to be rejected",
      );
    }
    expect(result.error).toEqual({
      code: "invalid-starter-delivery",
      correlationId: "corr-001",
    });
  });

  it("returns a safe error when the destination has no active graph connection", () => {
    const result = acceptStarterDelivery(
      { ...readyDestinationState(), connectionId: undefined },
      {
        correlationId: "corr-001",
        pairingId: "pairing-001",
        protocolVersion: "v1",
        sourceEpic: {
          id: "10017",
          key: "MFG-17",
          summary: "Approve material source",
          updatedAt: "2026-08-07T19:00:00.000Z",
          url: "https://manufacturer.example/browse/MFG-17",
        },
      },
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected delivery without a connection to fail");
    }
    expect(result.error).toEqual({
      code: "destination-connection-unavailable",
      correlationId: "corr-001",
    });
  });

  it("returns a safe error when no active local Pairing matches the Source Epic", () => {
    const result = acceptStarterDelivery(readyDestinationState(), {
      correlationId: "corr-001",
      pairingId: "pairing-001",
      protocolVersion: "v1",
      sourceEpic: {
        id: "10099",
        key: "MFG-99",
        summary: "Unpaired source epic",
        updatedAt: "2026-08-07T19:00:00.000Z",
        url: "https://manufacturer.example/browse/MFG-99",
      },
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected a mismatched Pairing to block delivery");
    }
    expect(result.error).toEqual({
      code: "destination-pairing-unavailable",
      correlationId: "corr-001",
      pairingId: "pairing-001",
    });
  });

  it("makes duplicate delivery safe without a persistent idempotency record", () => {
    const request = {
      correlationId: "corr-001",
      pairingId: "pairing-001",
      protocolVersion: "v1" as const,
      sourceEpic: {
        id: "10017",
        key: "MFG-17",
        summary: "Approve material source",
        updatedAt: "2026-08-07T19:00:00.000Z",
        url: "https://manufacturer.example/browse/MFG-17",
      },
    };

    const firstDelivery = expectOk(
      acceptStarterDelivery(readyDestinationState(), request),
    );
    const duplicateDelivery = expectOk(
      acceptStarterDelivery(readyDestinationState(), request),
    );

    expect(duplicateDelivery).toEqual(firstDelivery);
  });

  it("derives the same document identity with a lower sequence for stale delivery", () => {
    const current = expectOk(
      acceptStarterDelivery(readyDestinationState(), {
        correlationId: "corr-current",
        pairingId: "pairing-001",
        protocolVersion: "v1",
        sourceEpic: {
          id: "10017",
          key: "MFG-17",
          summary: "Approve material source",
          updatedAt: "2026-08-07T19:00:00.000Z",
          url: "https://manufacturer.example/browse/MFG-17",
        },
      }),
    );
    const stale = expectOk(
      acceptStarterDelivery(readyDestinationState(), {
        correlationId: "corr-stale",
        pairingId: "pairing-001",
        protocolVersion: "v1",
        sourceEpic: {
          id: "10017",
          key: "MFG-17",
          summary: "Earlier source view",
          updatedAt: "2026-08-06T19:00:00.000Z",
          url: "https://manufacturer.example/browse/MFG-17",
        },
      }),
    );

    expect(stale.document.id).toBe(current.document.id);
    expect(stale.document.updateSequence).toBeLessThan(
      current.document.updateSequence,
    );
  });
});
