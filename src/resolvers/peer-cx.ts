import type Resolver from "@forge/resolver";

import {
  kvsLifecycleJournalStore,
  recordLifecycleOutcome,
} from "../audit/kvs-lifecycle-journal-store";
import { authorizePairing } from "../pairing/authorize-pairing";
import { kvsInvitationStore } from "../pairing/kvs-invitation-store";
import { kvsPeerCxStore } from "../pairing/kvs-peer-cx-store";
import { kvsPeerPairingStore } from "../pairing/kvs-peer-pairing-store";
import { summarizeForAdministrator } from "../pairing/peer-cx-overview";
import { revokePeerCx } from "../pairing/revoke-peer-cx";

interface AuthorizePairingPayload {
  readonly allowedOperations: readonly string[];
  readonly correlationId: string;
  readonly pairing: unknown;
}

interface RevokePeerCxPayload {
  readonly correlationId: string;
  readonly peerCxId: string;
  readonly safeReason: string;
}

export function registerPeerCxResolvers(resolver: Resolver): void {
  /**
   * The administrator's own view of this tenant's PeerCXs. It is built
   * from local state alone and carries no secret, signature, peer delivery
   * endpoint, or Jira content, because an administrator screen is a place any of
   * those would leak from permanently.
   */
  resolver.define("getPeerCxOverview", async () => {
    const [state, { pairings }, journal, { invitations }] = await Promise.all([
      kvsPeerCxStore.read(),
      kvsPeerPairingStore.read(),
      kvsLifecycleJournalStore.read(),
      // An Invitation is a PeerCX in its first state, so the overview reads the
      // invitation store too rather than showing only what has been agreed.
      kvsInvitationStore.read(),
    ]);

    return summarizeForAdministrator({
      invitations,
      journal,
      now: new Date().toISOString(),
      pairings,
      state,
    });
  });

  /**
   * An administrator's authorization of one Pairing. An active PeerCX is
   * the precondition; this call still has to bind the two Epics and the explicit
   * operation allowlist the Pairing may operate under.
   */
  resolver.define<AuthorizePairingPayload, unknown>(
    "authorizePairing",
    async ({ payload }) => {
      const [state, pairingState] = await Promise.all([
        kvsPeerCxStore.read(),
        kvsPeerPairingStore.read(),
      ]);
      const authorizedAt = new Date().toISOString();
      const authorized = authorizePairing(state, pairingState, {
        actor: "local-administrator",
        allowedOperations: payload.allowedOperations as never,
        authorizedAt,
        correlationId: payload.correlationId,
        pairing: payload.pairing as never,
      });
      if (authorized.isErr()) {
        return { reason: authorized.error.code, status: "blocked" };
      }

      await kvsPeerPairingStore.write(authorized.value.nextState);

      return { status: "authorized" };
    },
  );

  /**
   * Either local administrator's unilateral revocation. It takes effect on this
   * tenant's own state, so it needs no counterpart consent and no successful
   * notification: the counterpart learns of it when its next request is refused.
   */
  resolver.define<RevokePeerCxPayload, unknown>(
    "revokePeerCx",
    async ({ context, payload }) => {
      const state = await kvsPeerCxStore.read();
      const revokedAt = new Date().toISOString();
      const revoked = revokePeerCx(state, {
        actor: "local-administrator",
        correlationId: payload.correlationId,
        peerCxId: payload.peerCxId,
        revokedAt,
        safeReason: payload.safeReason,
      });
      if (revoked.isErr()) {
        return { reason: revoked.error.code, status: "blocked" };
      }

      await kvsPeerCxStore.write(revoked.value.nextState);
      await recordLifecycleOutcome({
        ...revoked.value.auditEvent,
        ...(typeof context["accountId"] === "string"
          ? { actorAccountId: context["accountId"] }
          : {}),
      });

      return { status: "revoked" };
    },
  );
}
