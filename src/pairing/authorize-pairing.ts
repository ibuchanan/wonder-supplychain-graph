import { err, ok, type Result } from "@forge-ahead/errors";

import type { PeerOperation } from "../collaboration/protocol";
import type { PeerPairing, PeerPairingState } from "./peer-pairing-state";
import { evaluateSiteRelationshipAuthorization } from "./site-relationship";
import type { SiteRelationshipSetupState } from "./site-relationship-nomination";

/**
 * One local administrator's authorization of a single Pairing. The prospective
 * binding arrives already shaped for its role; what this command adds is the
 * decision to activate it, and the explicit allowlist it may operate under.
 */
export interface AuthorizePairingCommand {
  readonly actor: "local-administrator";
  readonly allowedOperations: readonly PeerOperation[];
  readonly authorizedAt: string;
  readonly correlationId: string;
  readonly pairing: PeerPairing;
}

export interface PairingAuthorizationResult {
  readonly nextState: PeerPairingState;
}

export type AuthorizePairingError = {
  readonly code:
    | "epic-binding-required"
    | "operation-not-agreed"
    | "relationship-unauthorized";
};

/**
 * Creates or activates one Pairing beneath an active Site relationship.
 *
 * An active relationship is a precondition, never a grant: it authorizes
 * nothing on its own, and this command still has to bind exactly one Source
 * Epic, one Paired Epic, and an explicit operation allowlist drawn from the
 * scope the two sites actually agreed.
 */
export function authorizePairing(
  state: SiteRelationshipSetupState,
  pairingState: PeerPairingState,
  command: AuthorizePairingCommand,
): Result<PairingAuthorizationResult, AuthorizePairingError> {
  const { pairing } = command;
  const relationship = state.relationships.find(
    (candidate) => candidate.relationshipId === pairing.relationshipId,
  );
  if (
    !evaluateSiteRelationshipAuthorization(relationship, {
      counterpartSiteAri: relationship?.counterpartSiteAri ?? "",
      now: command.authorizedAt,
      relationshipId: pairing.relationshipId,
    }).authorized
  ) {
    return err({ code: "relationship-unauthorized" });
  }

  // A Pairing is exactly one Source Epic and one Paired Epic. A half-bound
  // Pairing would resolve its missing side from whatever arrived later.
  if (!pairing.sourceEpicKey.trim() || !pairing.pairedEpicKey.trim()) {
    return err({ code: "epic-binding-required" });
  }

  // The agreed scope bounds every Pairing beneath the relationship, so an
  // allowlist cannot reach past what the two sites consented to. An empty
  // allowlist authorizes nothing, which makes it a refusal, not a default.
  const agreed = state.nominations.find(
    (candidate) => candidate.relationshipId === pairing.relationshipId,
  )?.terms.allowedOperations;
  if (
    command.allowedOperations.length === 0 ||
    !command.allowedOperations.every((operation) => agreed?.includes(operation))
  ) {
    return err({ code: "operation-not-agreed" });
  }

  return ok({
    nextState: {
      pairings: [
        ...pairingState.pairings.filter(
          (candidate) => candidate.pairingId !== pairing.pairingId,
        ),
        {
          ...pairing,
          allowedOperations: [...command.allowedOperations],
          status: "active" as const,
        },
      ],
    },
  });
}
