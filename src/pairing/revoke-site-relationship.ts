import { err, ok, type Result } from "@forge-ahead/errors";

import type { LifecycleAuditEvent } from "../audit/lifecycle-journal";
import type { SiteRelationshipSetupState } from "./site-relationship-nomination";

/**
 * One local administrator's decision to end a Site relationship. Revocation is
 * unilateral and tenant-local: it needs no counterpart consent and no
 * successful notification to take effect.
 */
export interface RevokeSiteRelationshipCommand {
  readonly actor: "local-administrator";
  readonly correlationId: string;
  readonly relationshipId: string;
  readonly revokedAt: string;
  /** Recorded as evidence; never a secret, signature, endpoint, or content. */
  readonly safeReason: string;
}

export interface SiteRelationshipRevocationResult {
  /**
   * The evidence this revocation implies. A revocation nobody recorded is
   * indistinguishable from a relationship that never activated, so it is
   * returned here rather than left to each caller to remember.
   */
  readonly auditEvent: LifecycleAuditEvent;
  readonly nextState: SiteRelationshipSetupState;
}

export type RevokeSiteRelationshipError = {
  readonly code: "relationship-not-found";
};

/**
 * Revokes one local Site relationship. Nothing else has to change: every
 * Pairing is authorized through its relationship, so a relationship that is no
 * longer active stops the tenant's send and receive authorization for all of
 * them at once.
 */
export function revokeSiteRelationship(
  state: SiteRelationshipSetupState,
  command: RevokeSiteRelationshipCommand,
): Result<SiteRelationshipRevocationResult, RevokeSiteRelationshipError> {
  const relationship = state.relationships.find(
    (candidate) => candidate.relationshipId === command.relationshipId,
  );
  if (!relationship) {
    return err({ code: "relationship-not-found" });
  }

  return ok({
    auditEvent: {
      correlationId: command.correlationId,
      eventId: `audit:${command.relationshipId}:revoked`,
      eventType: "relationship.revoked" as const,
      occurredAt: command.revokedAt,
      outcome: "recorded" as const,
      reason: command.safeReason,
      relationshipId: command.relationshipId,
    },
    nextState: {
      ...state,
      relationships: state.relationships.map((candidate) =>
        candidate === relationship
          ? { ...candidate, status: "revoked" as const }
          : candidate,
      ),
    },
  });
}
