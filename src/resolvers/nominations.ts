import { fetch as forgeFetch, getAppContext, webTrigger } from "@forge/api";
import type Resolver from "@forge/resolver";

import { recordLifecycleOutcome } from "../audit/kvs-lifecycle-journal-store";
import { kvsPeerCxStore } from "../pairing/kvs-peer-cx-store";
import {
  type DecideNominationCommand,
  decidePeerCxNomination,
  nominatePeerCx,
} from "../pairing/peer-cx-nomination";
import {
  acceptActivationProposal,
  activateAfterConfirmation,
} from "../pairing/peer-cx-activation";
import {
  pollGreenForActivation,
  sendConfirmation,
} from "../pairing/request-activation";
import { sendNomination } from "../pairing/send-nomination";
import { readInstallationReadiness } from "../pairing/read-installation-readiness";

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

interface ConfirmActivationPayload {
  readonly correlationId: string;
  readonly greenBootstrapUrl: string;
}

export function registerNominationsResolvers(resolver: Resolver): void {
  /**
   * Blue's Join peer invitation action. Local consent is recorded before the
   * request is sent, and nothing is activated by a successful delivery.
   */
  resolver.define<NominatePayload, unknown>(
    "nominateSite",
    async ({ context, payload }) => {
      const identity = localIdentity();
      const readiness = await readInstallationReadiness({
        getIdentity: () => {
          const context = getAppContext();
          return {
            environmentAri: context.environmentAri.toString(),
            installationAri: context.installationAri.toString(),
            ...(identity ? { siteAri: identity.siteAri } : {}),
          };
        },
        getSecret: () => process.env["SHARED_SECRET"],
        readDurableState: () => kvsPeerCxStore.read(),
      });

      if (!identity) {
        return { reason: "local-identity-unavailable", status: "blocked" };
      }

      // The endpoint URL itself never leaves this function; only its status does.
      const receiverEndpoint = await webTrigger
        .getUrl("scg-receive-peer-event")
        .catch(() => undefined);

      const state = await kvsPeerCxStore.read();
      const idempotencyKey = `${payload.correlationId}:nominate`;
      // A resubmitted consent must keep proposing the same PeerCX ID, so
      // Blue and Green never disagree about which PeerCX this is.
      const recorded = state.nominations.find(
        (candidate) =>
          candidate.role === "blue" &&
          candidate.idempotencyKey === idempotencyKey,
      );
      const nominated = nominatePeerCx(state, {
        actor: "blue-administrator",
        consentedAt: new Date().toISOString(),
        correlationId: payload.correlationId,
        idempotencyKey,
        intendedReceiverSiteAri: payload.intendedReceiverSiteAri,
        invitationReference: payload.invitationReference,
        localIdentity: identity,
        localReadiness: readiness.status,
        operation: "peer-cx.nominate",
        receiverEndpointStatus: receiverEndpoint
          ? "configured"
          : "not-configured",
        peerCxId: recorded?.peerCxId ?? globalThis.crypto.randomUUID(),
        requestId: globalThis.crypto.randomUUID(),
        terms: payload.terms as never,
      });
      if (nominated.isErr()) {
        return { reason: nominated.error.code, status: "blocked" };
      }

      await kvsPeerCxStore.write(nominated.value.nextState);
      // Local consent is recorded before the request is sent, so the evidence
      // exists whether or not the delivery succeeds.
      await recordLifecycleOutcome({
        ...(typeof context["accountId"] === "string"
          ? { actorAccountId: context["accountId"] }
          : {}),
        correlationId: payload.correlationId,
        eventId: `audit:${idempotencyKey}:nominated`,
        eventType: "peer-cx.nominated",
        occurredAt: nominated.value.request.createdAt,
        outcome: "recorded",
        peerCxId: nominated.value.request.peerCxId,
      });

      const sent = await sendNomination(
        payload.greenBootstrapUrl,
        nominated.value.request,
        { fetch: forgeFetch, secret: process.env["SHARED_SECRET"] },
      );

      return sent.isErr()
        ? { reason: sent.error.code, status: "awaiting-retry" }
        : { status: "awaiting-green-approval" };
    },
  );

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

      const transport = {
        fetch: forgeFetch,
        secret: process.env["SHARED_SECRET"],
      };
      const state = await kvsPeerCxStore.read();
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
          operation: "peer-cx.poll",
          protocolVersion: "v1",
          peerCxId: pending.peerCxId,
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

      await kvsPeerCxStore.write(accepted.value.nextState);

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

      await kvsPeerCxStore.write(activated.value.nextState);
      // Blue activates only after Green's authenticated success receipt, so one
      // exchange is evidence of both the confirmation and the activation.
      const occurredAt = new Date().toISOString();
      for (const eventType of [
        "peer-cx.confirmed",
        "peer-cx.activated",
      ] as const) {
        await recordLifecycleOutcome({
          correlationId: pending.correlationId,
          eventId: `audit:${pending.correlationId}:${eventType}`,
          eventType,
          occurredAt,
          outcome: "recorded",
          peerCxId: activated.value.peerCx.peerCxId,
        });
      }

      return {
        peerCxId: activated.value.peerCx.peerCxId,
        status: "active",
      };
    },
  );

  /** Green's review list. Safe, non-secret review fields only. */
  resolver.define("listNominations", async () => {
    const { nominations } = await kvsPeerCxStore.read();

    return {
      nominations: nominations
        .filter((nomination) => nomination.role === "green")
        .map((nomination) => ({
          correlationId: nomination.correlationId,
          nominatedIdentity: nomination.nominatedIdentity,
          receiverEndpointStatus: nomination.receiverEndpointStatus,
          status: nomination.status,
          terms: nomination.terms,
          ...(nomination.safeReason
            ? { safeReason: nomination.safeReason }
            : {}),
        })),
    };
  });

  /** Green's approve, reject, or leave-pending decision. */
  resolver.define<
    Omit<DecideNominationCommand, "actor" | "decidedAt">,
    unknown
  >("decideNomination", async ({ context, payload }) => {
    const state = await kvsPeerCxStore.read();
    const decided = decidePeerCxNomination(state, {
      ...payload,
      actor: "green-administrator",
      decidedAt: new Date().toISOString(),
    });

    if (decided.isErr()) {
      if (decided.error.code === "nomination-changed") {
        await kvsPeerCxStore.write(decided.error.nextState);
      }

      return { reason: decided.error.code, status: "blocked" };
    }

    await kvsPeerCxStore.write(decided.value.nextState);

    if (decided.value.outcome !== "awaiting-green-approval") {
      await recordLifecycleOutcome({
        ...(typeof context["accountId"] === "string"
          ? { actorAccountId: context["accountId"] }
          : {}),
        correlationId: payload.correlationId,
        eventId: `audit:${payload.idempotencyKey}:${decided.value.outcome}`,
        eventType:
          decided.value.outcome === "rejected"
            ? "peer-cx.nomination-rejected"
            : "peer-cx.nomination-approved",
        occurredAt: new Date().toISOString(),
        outcome: "recorded",
        ...(payload.safeReason ? { reason: payload.safeReason } : {}),
      });
    }

    return { outcome: decided.value.outcome, status: "decided" };
  });
}
