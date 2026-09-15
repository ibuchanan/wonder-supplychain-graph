import type {
  LifecycleAuditEvent,
  LifecycleAuditJournal,
} from "../audit/lifecycle-journal";
import type { PeerOperation } from "../collaboration/protocol";
import type { PeerPairing } from "./peer-pairing-state";
import type { SiteRelationship } from "./site-relationship";
import type { SiteRelationshipSetupState } from "./site-relationship-nomination";

/**
 * What one local Site relationship looks like to its own administrator. Every
 * field here is safe to render: there is deliberately no shared secret, no
 * signature, no peer delivery endpoint, and no Jira content, because the
 * administrator screen is a place any of those would leak from permanently.
 */
export interface RelationshipOverview {
  readonly agreedOperations: readonly PeerOperation[];
  readonly agreementEndsAt: string;
  readonly counterpartSiteAri: string;
  readonly pairingCount: number;
  readonly relationshipId: string;
  readonly status: SiteRelationship["status"];
  readonly termsVersion: string;
}

export interface AdministratorOverview {
  readonly auditOutcomes: readonly LifecycleAuditEvent[];
  readonly relationships: readonly RelationshipOverview[];
}

export interface AdministratorOverviewInput {
  readonly journal: LifecycleAuditJournal;
  readonly now: string;
  readonly pairings: readonly PeerPairing[];
  readonly state: SiteRelationshipSetupState;
}

/**
 * Builds the administrator view from local state alone. It makes no peer
 * request and no claim about the counterpart tenant's own records.
 */
export function summarizeForAdministrator(
  input: AdministratorOverviewInput,
): AdministratorOverview {
  return {
    auditOutcomes: input.journal.events,
    relationships: input.state.relationships.map((relationship) => {
      const nomination = input.state.nominations.find(
        (candidate) => candidate.relationshipId === relationship.relationshipId,
      );

      return {
        agreedOperations: nomination?.terms.allowedOperations ?? [],
        agreementEndsAt: relationship.leaseEndsAt,
        counterpartSiteAri: relationship.counterpartSiteAri,
        pairingCount: input.pairings.filter(
          (pairing) =>
            pairing.relationshipId === relationship.relationshipId &&
            pairing.status === "active",
        ).length,
        relationshipId: relationship.relationshipId,
        // A lapsed lease is already refused by the gate; the screen has to
        // agree with what the tenant will actually do, not with its own state.
        status:
          relationship.status === "active" &&
          input.now >= relationship.leaseEndsAt
            ? ("expired" as const)
            : relationship.status,
        termsVersion: relationship.termsVersion,
      };
    }),
  };
}
