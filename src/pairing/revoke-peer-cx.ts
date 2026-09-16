import { err, ok, type Result } from "@forge-ahead/errors";

import type { LifecycleAuditEvent } from "../audit/lifecycle-journal";
import type { PeerCxSetupState } from "./peer-cx-nomination";

/**
 * One local administrator's decision to end a PeerCX. Revocation is
 * unilateral and tenant-local: it needs no counterpart consent and no
 * successful notification to take effect.
 */
export interface RevokePeerCxCommand {
  readonly actor: "local-administrator";
  readonly correlationId: string;
  readonly peerCxId: string;
  readonly revokedAt: string;
  /** Recorded as evidence; never a secret, signature, endpoint, or content. */
  readonly safeReason: string;
}

export interface PeerCxRevocationResult {
  /**
   * The evidence this revocation implies. A revocation nobody recorded is
   * indistinguishable from a PeerCX that never activated, so it is
   * returned here rather than left to each caller to remember.
   */
  readonly auditEvent: LifecycleAuditEvent;
  readonly nextState: PeerCxSetupState;
}

export type RevokePeerCxError = {
  readonly code: "peer-cx-not-found";
};

/**
 * Revokes one local PeerCX. Nothing else has to change: every
 * Pairing is authorized through its PeerCX, so a PeerCX that is no
 * longer active stops the tenant's send and receive authorization for all of
 * them at once.
 */
export function revokePeerCx(
  state: PeerCxSetupState,
  command: RevokePeerCxCommand,
): Result<PeerCxRevocationResult, RevokePeerCxError> {
  const peerCx = state.peerCxs.find(
    (candidate) => candidate.peerCxId === command.peerCxId,
  );
  if (!peerCx) {
    return err({ code: "peer-cx-not-found" });
  }

  return ok({
    auditEvent: {
      correlationId: command.correlationId,
      eventId: `audit:${command.peerCxId}:revoked`,
      eventType: "peer-cx.revoked" as const,
      occurredAt: command.revokedAt,
      outcome: "recorded" as const,
      reason: command.safeReason,
      peerCxId: command.peerCxId,
    },
    nextState: {
      ...state,
      peerCxs: state.peerCxs.map((candidate) =>
        candidate === peerCx
          ? { ...candidate, status: "revoked" as const }
          : candidate,
      ),
    },
  });
}
