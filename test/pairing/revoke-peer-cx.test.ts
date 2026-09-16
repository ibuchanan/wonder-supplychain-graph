import { describe, expect, it } from "vitest";

import { authorizePeerRoute } from "../../src/collaboration/peer-route-authorization";
import type { PeerCxSetupState } from "../../src/pairing/peer-cx-nomination";
import type { SourcePeerPairing } from "../../src/pairing/peer-pairing-state";
import { revokePeerCx } from "../../src/pairing/revoke-peer-cx";

const peerCx = {
  counterpartSiteAri: "ari:cloud:jira::site/green-site",
  leaseEndsAt: "2027-09-15T12:00:00.000Z",
  peerCxId: "peer-cx-001",
  status: "active",
  termsVersion: "v1",
} as const;

const firstPairing: SourcePeerPairing = {
  allowedOperations: ["starter.delivery"],
  pairedEpicKey: "GREEN-9",
  pairingId: "pairing-001",
  peerEventUrl: "https://peer.example/webtrigger",
  peerCxId: "peer-cx-001",
  role: "source",
  sourceEpicKey: "GREEN-1",
  sourceSiteAri: "ari:cloud:jira::site/blue-site",
  sourceSiteUrl: "https://blue.example",
  status: "active",
};

const state: PeerCxSetupState = {
  nominations: [],
  processedIdempotencyKeys: [],
  peerCxs: [peerCx],
};

const command = {
  actor: "local-administrator",
  correlationId: "correlation-001",
  peerCxId: "peer-cx-001",
  revokedAt: "2026-09-15T12:00:00.000Z",
  safeReason: "supplier engagement ended",
} as const;

describe("revokePeerCx", () => {
  it("records the named PeerCX as revoked", () => {
    const revoked = revokePeerCx(state, command);

    expect(revoked.isOk() && revoked.value.nextState.peerCxs).toEqual([
      { ...peerCx, status: "revoked" },
    ]);
  });

  it("returns the evidence the revocation implies", () => {
    // Revocation without a record is indistinguishable from a PeerCX
    // that never activated, so the function hands back the event rather than
    // leaving each caller to remember to write one.
    const revoked = revokePeerCx(state, command);

    expect(revoked.isOk() && revoked.value.auditEvent).toMatchObject({
      correlationId: "correlation-001",
      eventType: "peer-cx.revoked",
      occurredAt: command.revokedAt,
      outcome: "recorded",
      reason: command.safeReason,
      peerCxId: "peer-cx-001",
    });
  });

  it("immediately blocks send and receive for every pairing under it", () => {
    // Revocation is not applied Pairing by Pairing. Each Pairing is authorized
    // through its PeerCX, so one revoked PeerCX stops them all
    // without the tenant having to find and disable each one.
    const pairings: readonly SourcePeerPairing[] = [
      firstPairing,
      { ...firstPairing, pairingId: "pairing-002", sourceEpicKey: "GREEN-2" },
    ];
    const revoked = revokePeerCx(state, command);
    const { peerCxs } = revoked.isOk()
      ? revoked.value.nextState
      : { peerCxs: [] };

    for (const pairing of pairings) {
      expect(
        authorizePeerRoute(peerCxs, pairings, {
          counterpartSiteAri: peerCx.counterpartSiteAri,
          now: command.revokedAt,
          operation: "starter.delivery",
          pairingId: pairing.pairingId,
          peerCxId: peerCx.peerCxId,
          role: "source",
          sourceEpicKey: pairing.sourceEpicKey,
        }),
      ).toMatchObject({ error: { code: "peer-cx-unauthorized" } });
    }
  });
});
