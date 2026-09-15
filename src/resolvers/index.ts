import { getAppContext } from "@forge/api";
import Resolver from "@forge/resolver";

import {
  createInvitation,
  readInvitation,
} from "../pairing/invitation-workflow";
import { kvsInvitationStore } from "../pairing/kvs-invitation-store";
import { kvsPeerPairingStore } from "../pairing/kvs-peer-pairing-store";
import {
  determineLocalReadiness,
  type LocalRole,
} from "../pairing/local-readiness";
import { readPocReadiness } from "../pairing/read-poc-readiness";
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

export const handler = resolver.getDefinitions();
