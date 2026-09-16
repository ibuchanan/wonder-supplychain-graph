import type { Invitation } from "./invitation-workflow";
import type { PeerCx } from "./peer-cx";
import type { PeerCxNomination } from "./peer-cx-nomination";

/**
 * What one PeerCX looks like to an administrator. It is derived on read rather
 * than stored, so no record has to be written when a lease simply passes.
 */
export type PeerCxStatus =
  | "active"
  | "confirming"
  | "declined"
  | "expired"
  | "invalidated"
  | "invited"
  | "proposed"
  | "revoked";

/**
 * Only the nomination's stage is needed, not the whole setup record, so the
 * bilateral protocol's fields stay out of the presentation seam.
 */
const nominationStatuses: Record<PeerCxNomination["status"], PeerCxStatus> = {
  active: "confirming",
  "awaiting-blue-confirmation": "confirming",
  "awaiting-green-approval": "proposed",
  invalidated: "invalidated",
  rejected: "declined",
};

export interface PeerCxStatusInput {
  readonly agreement?: PeerCx;
  /**
   * The invitation's own deadline is deliberately not consulted: the glossary
   * defines no status for a lapsed invitation, and reporting one as `expired`
   * would claim an agreement that was never recorded. Kept on the input so the
   * omission is visible rather than implied.
   */
  readonly invitation?: Pick<Invitation, "expiresAt">;
  readonly nomination?: Pick<PeerCxNomination, "status">;
  readonly now: string;
}

export function derivePeerCxStatus(
  input: PeerCxStatusInput,
): PeerCxStatus | undefined {
  const { agreement } = input;

  if (agreement) {
    if (agreement.status === "revoked") {
      return "revoked";
    }

    // A lapsed lease is refused by the authorization gate whatever the record
    // says, so the administrator has to be told what the tenant will actually
    // do rather than what was last written.
    return input.now > agreement.leaseEndsAt ? "expired" : "active";
  }

  if (input.nomination) {
    return nominationStatuses[input.nomination.status];
  }

  return input.invitation ? "invited" : undefined;
}
