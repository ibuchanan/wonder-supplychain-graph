import { describe, expect, it } from "vitest";

import { authorizePeerRoute } from "../../src/collaboration/peer-route-authorization";
import type { SourcePeerPairing } from "../../src/pairing/peer-pairing-state";
import { revokeSiteRelationship } from "../../src/pairing/revoke-site-relationship";
import type { SiteRelationshipSetupState } from "../../src/pairing/site-relationship-nomination";

const relationship = {
  counterpartSiteAri: "ari:cloud:jira::site/green-site",
  leaseEndsAt: "2027-09-15T12:00:00.000Z",
  relationshipId: "relationship-001",
  status: "active",
  termsVersion: "v1",
} as const;

const firstPairing: SourcePeerPairing = {
  allowedOperations: ["starter.delivery"],
  pairedEpicKey: "GREEN-9",
  pairingId: "pairing-001",
  peerEventUrl: "https://peer.example/webtrigger",
  relationshipId: "relationship-001",
  role: "source",
  sourceEpicKey: "GREEN-1",
  sourceSiteAri: "ari:cloud:jira::site/blue-site",
  sourceSiteUrl: "https://blue.example",
  status: "active",
};

const state: SiteRelationshipSetupState = {
  nominations: [],
  processedIdempotencyKeys: [],
  relationships: [relationship],
};

const command = {
  actor: "local-administrator",
  correlationId: "correlation-001",
  relationshipId: "relationship-001",
  revokedAt: "2026-09-15T12:00:00.000Z",
  safeReason: "supplier engagement ended",
} as const;

describe("revokeSiteRelationship", () => {
  it("records the named relationship as revoked", () => {
    const revoked = revokeSiteRelationship(state, command);

    expect(revoked.isOk() && revoked.value.nextState.relationships).toEqual([
      { ...relationship, status: "revoked" },
    ]);
  });

  it("returns the evidence the revocation implies", () => {
    // Revocation without a record is indistinguishable from a relationship
    // that never activated, so the function hands back the event rather than
    // leaving each caller to remember to write one.
    const revoked = revokeSiteRelationship(state, command);

    expect(revoked.isOk() && revoked.value.auditEvent).toMatchObject({
      correlationId: "correlation-001",
      eventType: "relationship.revoked",
      occurredAt: command.revokedAt,
      outcome: "recorded",
      reason: command.safeReason,
      relationshipId: "relationship-001",
    });
  });

  it("immediately blocks send and receive for every pairing under it", () => {
    // Revocation is not applied Pairing by Pairing. Each Pairing is authorized
    // through its relationship, so one revoked relationship stops them all
    // without the tenant having to find and disable each one.
    const pairings: readonly SourcePeerPairing[] = [
      firstPairing,
      { ...firstPairing, pairingId: "pairing-002", sourceEpicKey: "GREEN-2" },
    ];
    const revoked = revokeSiteRelationship(state, command);
    const { relationships } = revoked.isOk()
      ? revoked.value.nextState
      : { relationships: [] };

    for (const pairing of pairings) {
      expect(
        authorizePeerRoute(relationships, pairings, {
          counterpartSiteAri: relationship.counterpartSiteAri,
          now: command.revokedAt,
          operation: "starter.delivery",
          pairingId: pairing.pairingId,
          relationshipId: relationship.relationshipId,
          role: "source",
          sourceEpicKey: pairing.sourceEpicKey,
        }),
      ).toMatchObject({ error: { code: "relationship-unauthorized" } });
    }
  });
});
