import type Resolver from "@forge/resolver";

import { recordLifecycleOutcome } from "../audit/kvs-lifecycle-journal-store";
import {
  createInvitation,
  readInvitation,
} from "../pairing/invitation-workflow";
import { kvsInvitationStore } from "../pairing/kvs-invitation-store";

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

export function registerInvitationsResolvers(resolver: Resolver): void {
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
        eventType: "peer-cx.invitation-created",
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
            eventType: "peer-cx.invitation-recipient-mismatch",
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
        eventType: "peer-cx.invitation-viewed",
        occurredAt,
        outcome: "recorded",
      });

      return { invitation: result.value, status: "available" as const };
    },
  );
}
