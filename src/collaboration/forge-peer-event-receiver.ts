import { fetch, getAppContext } from "@forge/api";
import {
  buildSuccessResponse,
  defineWebTrigger,
  type WebTriggerResponse,
} from "@forge-ahead/triggers/webtrigger";
import { recordLifecycleOutcome } from "../audit/kvs-lifecycle-journal-store";
import type { LifecycleEventType } from "../audit/lifecycle-journal";
import { logger } from "../logging";
import { logPeerRequestDenied } from "../observability/domain-events";
import { kvsPeerPairingStore } from "../pairing/kvs-peer-pairing-store";
import { kvsSiteRelationshipStore } from "../pairing/kvs-site-relationship-store";
import { enrichLeanEventForAutomation } from "./lean-event-contract";
import { verifyPeerRequest } from "./peer-hmac-auth";
import { parsePeerOperationEnvelope } from "./peer-operation-envelope";
import { consumeRequestId } from "./peer-replay-guard";
import { authorizePeerRoute } from "./peer-route-authorization";

/** The only three answers a denied caller ever gets. See the bootstrap route. */
const deniedResponses = Object.freeze({
  "bad-request": 400,
  forbidden: 403,
  unauthorized: 401,
});

/**
 * Denials an administrator must still be able to investigate after the logs
 * have aged out. Both are security outcomes with no trustworthy correlation
 * ID: an unauthenticated body carries only attacker-supplied identifiers.
 */
const durableDenials: Readonly<Record<string, LifecycleEventType>> =
  Object.freeze({
    "invalid-hmac-secret": "peer.authentication-failed",
    "invalid-hmac-signature": "peer.authentication-failed",
    "invalid-hmac-timestamp": "peer.authentication-failed",
    "request-replayed": "peer.request-replayed",
  });

async function deny(
  error: keyof typeof deniedResponses,
  reason: string,
): Promise<WebTriggerResponse> {
  logPeerRequestDenied(logger, { reason, route: "peer-event" });

  const eventType = durableDenials[reason];
  if (eventType) {
    // The failure category, never the signature that produced it.
    await recordLifecycleOutcome({
      eventId: `audit:peer-event:${reason}:${globalThis.crypto.randomUUID()}`,
      eventType,
      occurredAt: new Date().toISOString(),
      outcome: "denied",
      reason,
    });
  }

  return {
    body: JSON.stringify({ error }),
    headers: { "Content-Type": ["application/json"] },
    statusCode: deniedResponses[error],
  };
}

/** This tenant's own site ARI, never a peer-supplied claim. */
function localSiteAri(): string | undefined {
  const cloudId = getAppContext().installation?.contexts.find(
    (installationContext) => installationContext.cloudId,
  )?.cloudId;

  return cloudId ? `ari:cloud:jira::site/${cloudId}` : undefined;
}

/**
 * Receives one authenticated peer operation and forwards its local enrichment
 * to Automation.
 *
 * A verified signature proves possession of the shared development secret, so
 * it is only the first of four gates: the request must also be addressed to
 * this receiver, claim a request ID this receiver has not already consumed,
 * and name an active in-lease relationship whose exact Pairing authorizes this
 * operation. Nothing is delivered until all four pass.
 */
export const receivePeerEvent = defineWebTrigger(async (request) => {
  const authenticationError = verifyPeerRequest(
    request,
    process.env["SHARED_SECRET"],
  );
  if (authenticationError) {
    return deny("unauthorized", authenticationError);
  }

  const envelope = parsePeerOperationEnvelope(request.body ?? "");
  if (!envelope) {
    return deny("bad-request", "invalid-peer-operation-envelope");
  }

  const receiverSiteAri = localSiteAri();
  if (!receiverSiteAri) {
    return deny("forbidden", "local-identity-unavailable");
  }

  // An envelope addressed elsewhere is not this receiver's to apply, however
  // validly it is signed.
  if (envelope.intendedReceiverSiteAri !== receiverSiteAri) {
    return deny("forbidden", "receiver-mismatch");
  }

  const now = new Date().toISOString();
  const consumption = await consumeRequestId(
    {
      receiverSiteAri,
      relationshipId: envelope.relationshipId,
      requestId: envelope.requestId,
    },
    now,
  );
  if (consumption !== "consumed") {
    return deny(
      "forbidden",
      consumption === "replayed" ? "request-replayed" : consumption,
    );
  }

  const [{ relationships }, { pairings }] = await Promise.all([
    kvsSiteRelationshipStore.read(),
    kvsPeerPairingStore.read(),
  ]);
  const authorized = authorizePeerRoute(relationships, pairings, {
    counterpartSiteAri: envelope.senderIdentity.siteAri,
    now,
    operation: envelope.operation,
    pairingId: envelope.pairingId,
    relationshipId: envelope.relationshipId,
    role: "destination",
    sourceEpicKey: envelope.event.data.issueKey,
  });
  if (authorized.isErr()) {
    return deny("forbidden", authorized.error.code);
  }

  const { pairing } = authorized.value;
  if (pairing.role !== "destination") {
    return deny("forbidden", "pairing-unauthorized");
  }

  try {
    const response = await fetch(pairing.automationWebhookUrl, {
      body: JSON.stringify(
        enrichLeanEventForAutomation(envelope.event, pairing.pairedEpicKey),
      ),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      return {
        body: JSON.stringify({ error: "automation-webhook-failed" }),
        headers: { "Content-Type": ["application/json"] },
        statusCode: 502,
      };
    }
  } catch {
    return {
      body: JSON.stringify({ error: "automation-webhook-failed" }),
      headers: { "Content-Type": ["application/json"] },
      statusCode: 502,
    };
  }

  return buildSuccessResponse({ outcome: "forwarded" });
});
