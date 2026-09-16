import type {
  LifecycleAuditEvent,
  LifecycleAuditJournal,
} from "../audit/lifecycle-journal";
import type { PeerOperation } from "../collaboration/protocol";
import type { PeerCx } from "./peer-cx";
import type { PeerCxSetupState } from "./peer-cx-nomination";
import type { PeerPairing } from "./peer-pairing-state";

/**
 * What one local PeerCX looks like to its own administrator. Every
 * field here is safe to render: there is deliberately no shared secret, no
 * signature, no peer delivery endpoint, and no Jira content, because the
 * administrator screen is a place any of those would leak from permanently.
 */
export interface PeerCxOverview {
  readonly agreedOperations: readonly PeerOperation[];
  readonly agreementEndsAt: string;
  readonly counterpartSiteAri: string;
  readonly pairingCount: number;
  readonly peerCxId: string;
  readonly status: PeerCx["status"];
  readonly termsVersion: string;
}

export interface AdministratorOverview {
  readonly auditOutcomes: readonly LifecycleAuditEvent[];
  readonly peerCxs: readonly PeerCxOverview[];
}

export interface AdministratorOverviewInput {
  readonly journal: LifecycleAuditJournal;
  readonly now: string;
  readonly pairings: readonly PeerPairing[];
  readonly state: PeerCxSetupState;
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
    peerCxs: input.state.peerCxs.map((peerCx) => {
      const nomination = input.state.nominations.find(
        (candidate) => candidate.peerCxId === peerCx.peerCxId,
      );

      return {
        agreedOperations: nomination?.terms.allowedOperations ?? [],
        agreementEndsAt: peerCx.leaseEndsAt,
        counterpartSiteAri: peerCx.counterpartSiteAri,
        pairingCount: input.pairings.filter(
          (pairing) =>
            pairing.peerCxId === peerCx.peerCxId && pairing.status === "active",
        ).length,
        peerCxId: peerCx.peerCxId,
        // A lapsed lease is already refused by the gate; the screen has to
        // agree with what the tenant will actually do, not with its own state.
        status:
          peerCx.status === "active" && input.now >= peerCx.leaseEndsAt
            ? ("expired" as const)
            : peerCx.status,
        termsVersion: peerCx.termsVersion,
      };
    }),
  };
}
