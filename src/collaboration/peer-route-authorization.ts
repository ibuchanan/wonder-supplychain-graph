import { err, ok, type Result } from "@forge-ahead/errors";
import { evaluatePeerCxAuthorization, type PeerCx } from "../pairing/peer-cx";
import type { PeerPairing } from "../pairing/peer-pairing-state";
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
  readonly peerCxId: string;
  readonly role: "destination" | "source";
  /** The Source Epic this request claims to carry. */
  readonly sourceEpicKey: string;
}

export type PeerRouteDenial = {
  readonly code:
    | "epic-not-bound"
    | "operation-not-allowed"
    | "pairing-unauthorized"
    | "peer-cx-unauthorized";
};

export interface PeerRouteAuthorization {
  readonly pairing: PeerPairing;
}

/**
 * The single gate every enabled peer route passes through. The four checks are
 * deliberately independent: site trust, then the exact Pairing, then that
 * Pairing's own operation allowlist, then the one Source Epic it binds.
 * Satisfying one never implies another, so a reusable PeerCX cannot
 * widen a Pairing, an authorized Pairing cannot outlive its PeerCX's
 * lease or revocation, and an allowed operation cannot substitute an Epic.
 */
export function authorizePeerRoute(
  peerCxs: readonly PeerCx[],
  pairings: readonly PeerPairing[],
  request: PeerRouteRequest,
): Result<PeerRouteAuthorization, PeerRouteDenial> {
  const peerCx = peerCxs.find(
    (candidate) => candidate.peerCxId === request.peerCxId,
  );
  if (
    !evaluatePeerCxAuthorization(peerCx, {
      counterpartSiteAri: request.counterpartSiteAri,
      now: request.now,
      peerCxId: request.peerCxId,
    }).authorized
  ) {
    return err({ code: "peer-cx-unauthorized" });
  }

  const pairing = pairings.find(
    (candidate) =>
      candidate.pairingId === request.pairingId &&
      candidate.role === request.role &&
      candidate.peerCxId === request.peerCxId &&
      candidate.status === "active",
  );
  if (!pairing) {
    return err({ code: "pairing-unauthorized" });
  }

  if (!pairing.allowedOperations?.includes(request.operation)) {
    return err({ code: "operation-not-allowed" });
  }

  // A Pairing binds exactly one Source Epic. Neither the PeerCX nor the
  // operation allowlist says anything about which Epic may be exchanged.
  return pairing.sourceEpicKey === request.sourceEpicKey
    ? ok({ pairing })
    : err({ code: "epic-not-bound" });
}
