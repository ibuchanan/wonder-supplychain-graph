import { err, ok, type Result } from "@forge-ahead/errors";

import type { PeerPairing } from "../pairing/peer-pairing-state";
import {
  evaluateSiteRelationshipAuthorization,
  type SiteRelationship,
} from "../pairing/site-relationship";
import type { PeerOperation } from "./protocol";

/**
 * What an authenticated peer request claims about its own authority. Every
 * field is untrusted input compared against receiver-owned state: a verified
 * signature proves possession of the shared secret and nothing else.
 */
export interface PeerRouteRequest {
  readonly counterpartSiteAri: string;
  readonly now: string;
  readonly operation: PeerOperation;
  readonly pairingId: string;
  readonly relationshipId: string;
  readonly role: "destination" | "source";
}

export type PeerRouteDenial = {
  readonly code:
    | "operation-not-allowed"
    | "pairing-unauthorized"
    | "relationship-unauthorized";
};

export interface PeerRouteAuthorization {
  readonly pairing: PeerPairing;
}

/**
 * The single gate every enabled peer route passes through. The three checks
 * are deliberately independent: site trust, then the exact Pairing, then that
 * Pairing's own operation allowlist. Satisfying one never implies another, so
 * a reusable relationship cannot widen a Pairing and an authorized Pairing
 * cannot outlive its relationship's lease or revocation.
 */
export function authorizePeerRoute(
  relationships: readonly SiteRelationship[],
  pairings: readonly PeerPairing[],
  request: PeerRouteRequest,
): Result<PeerRouteAuthorization, PeerRouteDenial> {
  const relationship = relationships.find(
    (candidate) => candidate.relationshipId === request.relationshipId,
  );
  if (
    !evaluateSiteRelationshipAuthorization(relationship, {
      counterpartSiteAri: request.counterpartSiteAri,
      now: request.now,
      relationshipId: request.relationshipId,
    }).authorized
  ) {
    return err({ code: "relationship-unauthorized" });
  }

  const pairing = pairings.find(
    (candidate) =>
      candidate.pairingId === request.pairingId &&
      candidate.role === request.role &&
      candidate.relationshipId === request.relationshipId &&
      candidate.status === "active",
  );
  if (!pairing) {
    return err({ code: "pairing-unauthorized" });
  }

  return pairing.allowedOperations?.includes(request.operation)
    ? ok({ pairing })
    : err({ code: "operation-not-allowed" });
}
