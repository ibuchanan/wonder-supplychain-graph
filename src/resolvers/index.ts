import { fetch, getAppContext, webTrigger } from "@forge/api";
import Resolver from "@forge/resolver";

import {
  kvsLifecycleJournalStore,
  recordLifecycleOutcome,
} from "../audit/kvs-lifecycle-journal-store";
import { authorizePairing } from "../pairing/authorize-pairing";
import {
  createInvitation,
  readInvitation,
} from "../pairing/invitation-workflow";
import { kvsInvitationStore } from "../pairing/kvs-invitation-store";
import { kvsPeerPairingStore } from "../pairing/kvs-peer-pairing-store";
import { kvsSiteRelationshipStore } from "../pairing/kvs-site-relationship-store";
import {
  determineLocalReadiness,
  type LocalRole,
} from "../pairing/local-readiness";
import { readPocReadiness } from "../pairing/read-poc-readiness";
import { summarizeForAdministrator } from "../pairing/relationship-overview";
import { revokeSiteRelationship } from "../pairing/revoke-site-relationship";
import {
  pollGreenForActivation,
  sendConfirmation,
} from "../pairing/request-activation";
import { sendNomination } from "../pairing/send-nomination";
import {
  acceptActivationProposal,
  activateAfterConfirmation,
} from "../pairing/site-relationship-activation";
import {
  type DecideNominationCommand,
  decideSiteRelationshipNomination,
  nominateSiteRelationship,
} from "../pairing/site-relationship-nomination";
import { kvsPackageConnectionStore } from "../projection/kvs-connection-store";

const resolver = new Resolver();

interface CreateInvitationPayload {
  readonly greenNavigationUrl: string;
  readonly purpose: string;
  readonly recipientAccountId: string;
  readonly safeLabel?: string;
}

function readCreateInvitationPayload(
  value: unknown,
): CreateInvitationPayload | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const payload = value as {
    greenNavigationUrl?: unknown;
    purpose?: unknown;
    recipientAccountId?: unknown;
    safeLabel?: unknown;
  };
  if (
    typeof payload.greenNavigationUrl !== "string" ||
    !payload.greenNavigationUrl ||
    typeof payload.recipientAccountId !== "string" ||
    !payload.recipientAccountId.trim() ||
    typeof payload.purpose !== "string" ||
    !payload.purpose.trim() ||
    (payload.safeLabel !== undefined && typeof payload.safeLabel !== "string")
  ) {
    return undefined;
  }

  return {
    greenNavigationUrl: payload.greenNavigationUrl,
    purpose: payload.purpose.trim(),
    recipientAccountId: payload.recipientAccountId.trim(),
    ...(typeof payload.safeLabel === "string" && payload.safeLabel.trim()
      ? { safeLabel: payload.safeLabel.trim() }
      : {}),
  };
}

resolver.define("getActionConfigStatus", () => ({ ready: true }));

resolver.define("createInvitation", async ({ context, payload }) => {
  const request = readCreateInvitationPayload(payload);
  if (!request) {
    return { status: "blocked" as const };
  }

  try {
    const state = await kvsInvitationStore.read();
    const created = createInvitation(state, {
      allowedOperations: ["starter.delivery"],
      createdAt: new Date().toISOString(),
      greenNavigationUrl: request.greenNavigationUrl,
      purpose: request.purpose,
      recipientAccountId: request.recipientAccountId,
      ...(request.safeLabel ? { safeLabel: request.safeLabel } : {}),
      termsVersion: "v1",
    });

    await kvsInvitationStore.write(created.nextState);
    await recordLifecycleOutcome({
      ...(typeof context["accountId"] === "string"
        ? { actorAccountId: context["accountId"] }
        : {}),
      correlationId: created.invitation.correlationId,
      eventId: `audit:${created.invitation.invitationId}:invitation-created`,
      eventType: "relationship.invitation-created",
      occurredAt: created.invitation.createdAt,
      outcome: "recorded",
    });

    return {
      correlationId: created.invitation.correlationId,
      navigationUrl: created.navigationUrl,
      status: "created" as const,
    };
  } catch {
    return { status: "blocked" as const };
  }
});

resolver.define<{ readonly reference: string }, unknown>(
  "readInvitation",
  async ({ context, payload }) => {
    const accountId =
      typeof context["accountId"] === "string"
        ? context["accountId"]
        : undefined;
    if (!accountId || !payload.reference.trim()) {
      return { status: "unavailable" as const };
    }

    const result = readInvitation(
      await kvsInvitationStore.read(),
      payload.reference,
      accountId,
    );
    const occurredAt = new Date().toISOString();

    if (result.isErr()) {
      // An invitation is recipient-bound, so a mismatch is a security outcome
      // worth evidence rather than a missing page. The reference itself is
      // never recorded: it is the hand-off token.
      if (result.error.code === "invitation-recipient-mismatch") {
        await recordLifecycleOutcome({
          actorAccountId: accountId,
          eventId: `audit:invitation-recipient-mismatch:${globalThis.crypto.randomUUID()}`,
          eventType: "relationship.invitation-recipient-mismatch",
          occurredAt,
          outcome: "denied",
          reason: result.error.code,
        });
      }

      return { status: "unavailable" as const };
    }

    await recordLifecycleOutcome({
      actorAccountId: accountId,
      correlationId: result.value.correlationId,
      eventId: `audit:${result.value.correlationId}:invitation-viewed`,
      eventType: "relationship.invitation-viewed",
      occurredAt,
      outcome: "recorded",
    });

    return { invitation: result.value, status: "available" as const };
  },
);

resolver.define("getPocReadiness", () =>
  readPocReadiness({
    getIdentity: () => {
      const context = getAppContext();
      const cloudId = context.installation?.contexts.find(
        (installationContext) => installationContext.cloudId,
      )?.cloudId;

      return {
        environmentAri: context.environmentAri.toString(),
        environmentType: context.environmentType,
        installationAri: context.installationAri.toString(),
        ...(cloudId ? { siteAri: `ari:cloud:jira::site/${cloudId}` } : {}),
      };
    },
    getSecret: () => process.env["SHARED_SECRET"],
    readDurableState: async () => {
      await Promise.all([
        kvsPeerPairingStore.read(),
        kvsPackageConnectionStore.getActiveConnectionId(),
      ]);
    },
  }),
);

resolver.define("getLocalReadiness", async () => {
  const configuredRole = process.env["DEMO_LOCAL_ROLE"];
  const role: LocalRole | undefined =
    configuredRole === "source" || configuredRole === "destination"
      ? configuredRole
      : undefined;
  const [pairingState, activeConnectionId] = await Promise.all([
    kvsPeerPairingStore.read(),
    kvsPackageConnectionStore.getActiveConnectionId(),
  ]);

  return determineLocalReadiness({
    ...(activeConnectionId ? { activeConnectionId } : {}),
    pairings: pairingState.pairings,
    ...(role ? { role } : {}),
  });
});

/** Blue's locally observed identity. Never a browser-supplied claim. */
function localIdentity() {
  const context = getAppContext();
  const cloudId = context.installation?.contexts.find(
    (installationContext) => installationContext.cloudId,
  )?.cloudId;

  return cloudId
    ? {
        environmentAri: context.environmentAri.toString(),
        installationAri: context.installationAri.toString(),
        siteAri: `ari:cloud:jira::site/${cloudId}`,
      }
    : undefined;
}

interface NominatePayload {
  readonly correlationId: string;
  readonly greenBootstrapUrl: string;
  readonly intendedReceiverSiteAri: string;
  readonly invitationReference: string;
  readonly terms: {
    readonly allowedOperations: readonly string[];
    readonly expiresAt: string;
    readonly termsVersion: string;
  };
}

/**
 * Blue's Join peer invitation action. Local consent is recorded before the
 * request is sent, and nothing is activated by a successful delivery.
 */
resolver.define<NominatePayload, unknown>(
  "nominateSite",
  async ({ context, payload }) => {
    const identity = localIdentity();
    const readiness = await readPocReadiness({
      getIdentity: () => {
        const context = getAppContext();
        return {
          environmentAri: context.environmentAri.toString(),
          environmentType: context.environmentType,
          installationAri: context.installationAri.toString(),
          ...(identity ? { siteAri: identity.siteAri } : {}),
        };
      },
      getSecret: () => process.env["SHARED_SECRET"],
      readDurableState: () => kvsSiteRelationshipStore.read(),
    });

    if (!identity) {
      return { reason: "local-identity-unavailable", status: "blocked" };
    }

    // The endpoint URL itself never leaves this function; only its status does.
    const receiverEndpoint = await webTrigger
      .getUrl("scg-receive-peer-event")
      .catch(() => undefined);

    const state = await kvsSiteRelationshipStore.read();
    const idempotencyKey = `${payload.correlationId}:nominate`;
    // A resubmitted consent must keep proposing the same relationship ID, so
    // Blue and Green never disagree about which relationship this is.
    const recorded = state.nominations.find(
      (candidate) =>
        candidate.role === "blue" &&
        candidate.idempotencyKey === idempotencyKey,
    );
    const nominated = nominateSiteRelationship(state, {
      actor: "blue-administrator",
      consentedAt: new Date().toISOString(),
      correlationId: payload.correlationId,
      idempotencyKey,
      intendedReceiverSiteAri: payload.intendedReceiverSiteAri,
      invitationReference: payload.invitationReference,
      localIdentity: identity,
      localReadiness: readiness.status,
      operation: "site-relationship.nominate",
      receiverEndpointStatus: receiverEndpoint
        ? "configured"
        : "not-configured",
      relationshipId:
        recorded?.relationshipId ?? globalThis.crypto.randomUUID(),
      requestId: globalThis.crypto.randomUUID(),
      terms: payload.terms as never,
    });
    if (nominated.isErr()) {
      return { reason: nominated.error.code, status: "blocked" };
    }

    await kvsSiteRelationshipStore.write(nominated.value.nextState);
    // Local consent is recorded before the request is sent, so the evidence
    // exists whether or not the delivery succeeds.
    await recordLifecycleOutcome({
      ...(typeof context["accountId"] === "string"
        ? { actorAccountId: context["accountId"] }
        : {}),
      correlationId: payload.correlationId,
      eventId: `audit:${idempotencyKey}:nominated`,
      eventType: "relationship.nominated",
      occurredAt: nominated.value.request.createdAt,
      outcome: "recorded",
      relationshipId: nominated.value.request.relationshipId,
    });

    const sent = await sendNomination(
      payload.greenBootstrapUrl,
      nominated.value.request,
      { fetch, secret: process.env["SHARED_SECRET"] },
    );

    return sent.isErr()
      ? { reason: sent.error.code, status: "awaiting-retry" }
      : { status: "awaiting-green-approval" };
  },
);

interface ConfirmActivationPayload {
  readonly correlationId: string;
  readonly greenBootstrapUrl: string;
}

/**
 * Blue's Waiting for Green approval action. One invocation is one bounded
 * poll: it keeps no session open, and it activates Blue's local record only
 * after Green's authenticated success response.
 */
resolver.define<ConfirmActivationPayload, unknown>(
  "confirmActivation",
  async ({ payload }) => {
    const identity = localIdentity();
    if (!identity) {
      return { reason: "local-identity-unavailable", status: "blocked" };
    }

    const transport = { fetch, secret: process.env["SHARED_SECRET"] };
    const state = await kvsSiteRelationshipStore.read();
    const pending = state.nominations.find(
      (candidate) =>
        candidate.role === "blue" &&
        candidate.correlationId === payload.correlationId,
    );
    if (!pending) {
      return { reason: "pending-nomination-not-found", status: "blocked" };
    }

    const polled = await pollGreenForActivation(
      payload.greenBootstrapUrl,
      {
        correlationId: pending.correlationId,
        createdAt: new Date().toISOString(),
        direction: "blue-to-green",
        intendedReceiverSiteAri: pending.counterpartSiteAri,
        nominatedIdentity: identity,
        operation: "site-relationship.poll",
        protocolVersion: "v1",
        relationshipId: pending.relationshipId,
        requestId: globalThis.crypto.randomUUID(),
        termsVersion: pending.terms.termsVersion,
      },
      transport,
    );
    if (polled.isErr()) {
      return { reason: polled.error.code, status: "awaiting-retry" };
    }
    if (!("proposal" in polled.value)) {
      return { status: polled.value.outcome };
    }

    const accepted = acceptActivationProposal(state, polled.value.proposal, {
      idempotencyKey: `${pending.correlationId}:confirm`,
      localIdentity: identity,
      now: new Date().toISOString(),
      requestId: globalThis.crypto.randomUUID(),
    });
    if (accepted.isErr()) {
      return { reason: accepted.error.code, status: "blocked" };
    }

    await kvsSiteRelationshipStore.write(accepted.value.nextState);

    const sent = await sendConfirmation(
      payload.greenBootstrapUrl,
      accepted.value.confirmation,
      transport,
    );
    if (sent.isErr()) {
      return { reason: sent.error.code, status: "awaiting-retry" };
    }

    const activated = activateAfterConfirmation(
      accepted.value.nextState,
      sent.value,
      { now: new Date().toISOString() },
    );
    if (activated.isErr()) {
      return { reason: activated.error.code, status: "blocked" };
    }

    await kvsSiteRelationshipStore.write(activated.value.nextState);
    // Blue activates only after Green's authenticated success receipt, so one
    // exchange is evidence of both the confirmation and the activation.
    const occurredAt = new Date().toISOString();
    for (const eventType of [
      "relationship.confirmed",
      "relationship.activated",
    ] as const) {
      await recordLifecycleOutcome({
        correlationId: pending.correlationId,
        eventId: `audit:${pending.correlationId}:${eventType}`,
        eventType,
        occurredAt,
        outcome: "recorded",
        relationshipId: activated.value.relationship.relationshipId,
      });
    }

    return {
      relationshipId: activated.value.relationship.relationshipId,
      status: "active",
    };
  },
);

/** Green's review list. Safe, non-secret review fields only. */
resolver.define("listNominations", async () => {
  const { nominations } = await kvsSiteRelationshipStore.read();

  return {
    nominations: nominations
      .filter((nomination) => nomination.role === "green")
      .map((nomination) => ({
        correlationId: nomination.correlationId,
        nominatedIdentity: nomination.nominatedIdentity,
        receiverEndpointStatus: nomination.receiverEndpointStatus,
        status: nomination.status,
        terms: nomination.terms,
        ...(nomination.safeReason ? { safeReason: nomination.safeReason } : {}),
      })),
  };
});

/** Green's approve, reject, or leave-pending decision. */
resolver.define<Omit<DecideNominationCommand, "actor" | "decidedAt">, unknown>(
  "decideNomination",
  async ({ context, payload }) => {
    const state = await kvsSiteRelationshipStore.read();
    const decided = decideSiteRelationshipNomination(state, {
      ...payload,
      actor: "green-administrator",
      decidedAt: new Date().toISOString(),
    });

    if (decided.isErr()) {
      if (decided.error.code === "nomination-changed") {
        await kvsSiteRelationshipStore.write(decided.error.nextState);
      }

      return { reason: decided.error.code, status: "blocked" };
    }

    await kvsSiteRelationshipStore.write(decided.value.nextState);

    if (decided.value.outcome !== "awaiting-green-approval") {
      await recordLifecycleOutcome({
        ...(typeof context["accountId"] === "string"
          ? { actorAccountId: context["accountId"] }
          : {}),
        correlationId: payload.correlationId,
        eventId: `audit:${payload.idempotencyKey}:${decided.value.outcome}`,
        eventType:
          decided.value.outcome === "rejected"
            ? "relationship.nomination-rejected"
            : "relationship.nomination-approved",
        occurredAt: new Date().toISOString(),
        outcome: "recorded",
        ...(payload.safeReason ? { reason: payload.safeReason } : {}),
      });
    }

    return { outcome: decided.value.outcome, status: "decided" };
  },
);

/**
 * The administrator's own view of this tenant's relationships. It is built
 * from local state alone and carries no secret, signature, peer delivery
 * endpoint, or Jira content, because an administrator screen is a place any of
 * those would leak from permanently.
 */
resolver.define("getRelationshipOverview", async () => {
  const [state, { pairings }, journal] = await Promise.all([
    kvsSiteRelationshipStore.read(),
    kvsPeerPairingStore.read(),
    kvsLifecycleJournalStore.read(),
  ]);

  return summarizeForAdministrator({
    journal,
    now: new Date().toISOString(),
    pairings,
    state,
  });
});

interface AuthorizePairingPayload {
  readonly allowedOperations: readonly string[];
  readonly correlationId: string;
  readonly pairing: unknown;
}

/**
 * An administrator's authorization of one Pairing. An active relationship is
 * the precondition; this call still has to bind the two Epics and the explicit
 * operation allowlist the Pairing may operate under.
 */
resolver.define<AuthorizePairingPayload, unknown>(
  "authorizePairing",
  async ({ payload }) => {
    const [state, pairingState] = await Promise.all([
      kvsSiteRelationshipStore.read(),
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

interface RevokeRelationshipPayload {
  readonly correlationId: string;
  readonly relationshipId: string;
  readonly safeReason: string;
}

/**
 * Either local administrator's unilateral revocation. It takes effect on this
 * tenant's own state, so it needs no counterpart consent and no successful
 * notification: the counterpart learns of it when its next request is refused.
 */
resolver.define<RevokeRelationshipPayload, unknown>(
  "revokeRelationship",
  async ({ context, payload }) => {
    const state = await kvsSiteRelationshipStore.read();
    const revokedAt = new Date().toISOString();
    const revoked = revokeSiteRelationship(state, {
      actor: "local-administrator",
      correlationId: payload.correlationId,
      relationshipId: payload.relationshipId,
      revokedAt,
      safeReason: payload.safeReason,
    });
    if (revoked.isErr()) {
      return { reason: revoked.error.code, status: "blocked" };
    }

    await kvsSiteRelationshipStore.write(revoked.value.nextState);
    await recordLifecycleOutcome({
      ...revoked.value.auditEvent,
      ...(typeof context["accountId"] === "string"
        ? { actorAccountId: context["accountId"] }
        : {}),
    });

    return { status: "revoked" };
  },
);

export const handler = resolver.getDefinitions();
