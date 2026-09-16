import type {
  LifecycleAuditEvent,
  LifecycleAuditJournal,
} from "../audit/lifecycle-journal";
import type { PeerOperation } from "../collaboration/protocol";
import type { Invitation } from "./invitation-workflow";
import type { PeerCxSetupState } from "./peer-cx-nomination";
import { derivePeerCxStatus, type PeerCxStatus } from "./peer-cx-status";
import type { PeerPairing } from "./peer-pairing-state";

/**
 * What one local PeerCX looks like to its own administrator. Every
 * field here is safe to render: there is deliberately no shared secret, no
 * signature, no peer delivery endpoint, and no Jira content, because the
 * administrator screen is a place any of those would leak from permanently.
 */
export interface PeerCxOverview {
  readonly agreedOperations: readonly PeerOperation[];
  /** Absent until an agreement is recorded: an invitation has no lease. */
  readonly agreementEndsAt?: string;
  /** Absent while invited: an Invitation names a recipient, not a site. */
  readonly counterpartSiteAri?: string;
  readonly pairingCount: number;
  readonly peerCxId: string;
  /** The only label a peer administrator sees before authorizing. */
  readonly safeLabel?: string;
  readonly status: PeerCxStatus;
  readonly termsVersion: string;
}

export interface AdministratorOverview {
  readonly auditOutcomes: readonly LifecycleAuditEvent[];
  readonly peerCxs: readonly PeerCxOverview[];
}

export interface AdministratorOverviewInput {
  readonly invitations: readonly Invitation[];
  readonly journal: LifecycleAuditJournal;
  readonly now: string;
  readonly pairings: readonly PeerPairing[];
  readonly state: PeerCxSetupState;
}

function countPairings(
  input: AdministratorOverviewInput,
  peerCxId: string,
): number {
  return input.pairings.filter(
    (pairing) => pairing.peerCxId === peerCxId && pairing.status === "active",
  ).length;
}

/**
 * An Invitation is a PeerCX in its first state, so it belongs in the same list
 * rather than a separate one. It carries no counterpart site and no lease,
 * because neither has been agreed with anyone yet.
 */
function invitedPeerCxs(
  input: AdministratorOverviewInput,
): readonly PeerCxOverview[] {
  return input.invitations.map((invitation) => ({
    agreedOperations: invitation.allowedOperations,
    pairingCount: 0,
    peerCxId: invitation.invitationId,
    ...(invitation.safeLabel ? { safeLabel: invitation.safeLabel } : {}),
    status: derivePeerCxStatus({ invitation, now: input.now }),
    termsVersion: invitation.termsVersion,
  }));
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
    peerCxs: [
      ...invitedPeerCxs(input),
      ...input.state.peerCxs.map((peerCx) => {
        const nomination = input.state.nominations.find(
          (candidate) => candidate.peerCxId === peerCx.peerCxId,
        );

        return {
          agreedOperations: nomination?.terms.allowedOperations ?? [],
          agreementEndsAt: peerCx.leaseEndsAt,
          counterpartSiteAri: peerCx.counterpartSiteAri,
          pairingCount: countPairings(input, peerCx.peerCxId),
          peerCxId: peerCx.peerCxId,
          status: derivePeerCxStatus({ agreement: peerCx, now: input.now }),
          termsVersion: peerCx.termsVersion,
        };
      }),
    ],
  };
}
