import { fetch, getAppContext, webTrigger } from "@forge/api";
import Resolver from "@forge/resolver";

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
import { sendNomination } from "../pairing/send-nomination";
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

resolver.define("createInvitation", async ({ payload }) => {
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
    if (result.isErr()) {
      return { status: "unavailable" as const };
    }

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
  async ({ payload }) => {
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
    const nominated = nominateSiteRelationship(state, {
      actor: "blue-administrator",
      consentedAt: new Date().toISOString(),
      correlationId: payload.correlationId,
      idempotencyKey: `${payload.correlationId}:nominate`,
      intendedReceiverSiteAri: payload.intendedReceiverSiteAri,
      invitationReference: payload.invitationReference,
      localIdentity: identity,
      localReadiness: readiness.status,
      operation: "site-relationship.nominate",
      receiverEndpointStatus: receiverEndpoint
        ? "configured"
        : "not-configured",
      requestId: globalThis.crypto.randomUUID(),
      terms: payload.terms as never,
    });
    if (nominated.isErr()) {
      return { reason: nominated.error.code, status: "blocked" };
    }

    await kvsSiteRelationshipStore.write(nominated.value.nextState);

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
  async ({ payload }) => {
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

    return { outcome: decided.value.outcome, status: "decided" };
  },
);

export const handler = resolver.getDefinitions();
