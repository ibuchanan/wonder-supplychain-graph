import { getAppContext } from "@forge/api";
import {
  buildSuccessResponse,
  defineWebTrigger,
  type WebTriggerResponse,
} from "@forge-ahead/triggers/webtrigger";

import { verifyPeerRequest } from "../collaboration/peer-hmac-auth";
import { consumeRequestId } from "../collaboration/peer-replay-guard";
import { logger } from "../logging";
import { logPeerRequestDenied } from "../observability/domain-events";
import { kvsInvitationStore } from "./kvs-invitation-store";
import { kvsSiteRelationshipStore } from "./kvs-site-relationship-store";
import {
  parseActivationPollRequest,
  parseConfirmationRequest,
} from "./parse-activation-envelopes";
import { parseNominationRequest } from "./parse-nomination-request";
import {
  proposeSiteRelationshipActivation,
  receiveSiteRelationshipConfirmation,
} from "./site-relationship-activation";
import {
  type NominatedIdentity,
  receiveSiteRelationshipNomination,
} from "./site-relationship-nomination";

/**
 * The only three answers a denied caller ever gets. Peer requests are refused
 * with an opaque body so the route cannot be used as an oracle for which check
 * failed, or for whether an invitation, relationship, or nomination exists.
 */
const deniedResponses = Object.freeze({
  "bad-request": 400,
  forbidden: 403,
  unauthorized: 401,
});

function deny(
  error: keyof typeof deniedResponses,
  reason: string,
  correlationId?: string,
): WebTriggerResponse {
  logPeerRequestDenied(logger, {
    ...(correlationId ? { correlationId } : {}),
    reason,
    route: "bootstrap",
  });

  return {
    body: JSON.stringify({ error }),
    headers: { "Content-Type": ["application/json"] },
    statusCode: deniedResponses[error],
  };
}

/** Green's own site/installation/environment, never a peer-supplied claim. */
function localIdentity(): NominatedIdentity | undefined {
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

/**
 * Green's dedicated bootstrap route. It is not an operational delivery
 * endpoint: it accepts only setup operations, only after the request signature
 * verifies, and it never returns or activates an endpoint.
 */
export const receiveBootstrapRequest = defineWebTrigger(async (request) => {
  const authenticationError = verifyPeerRequest(
    request,
    process.env["SHARED_SECRET"],
  );
  if (authenticationError) {
    return deny("unauthorized", authenticationError);
  }

  const body = request.body ?? "";
  const nomination = parseNominationRequest(body);
  const poll = parseActivationPollRequest(body);
  const confirmation = parseConfirmationRequest(body);
  const envelope = nomination ?? poll ?? confirmation;
  if (!envelope) {
    return deny("bad-request", "invalid-bootstrap-request");
  }

  const identity = localIdentity();
  if (!identity) {
    return deny("forbidden", "local-identity-unavailable");
  }

  const now = new Date().toISOString();

  // Claimed before any state is read or written, and before the outcome of any
  // check can be disclosed, so a captured request cannot repeat its effect.
  const consumption = await consumeRequestId(
    {
      receiverSiteAri: identity.siteAri,
      relationshipId: envelope.relationshipId,
      requestId: envelope.requestId,
    },
    now,
  );
  if (consumption !== "consumed") {
    return deny(
      "forbidden",
      consumption === "replayed" ? "request-replayed" : consumption,
      envelope.correlationId,
    );
  }

  const state = await kvsSiteRelationshipStore.read();

  if (poll) {
    const proposed = proposeSiteRelationshipActivation(state, poll, {
      localIdentity: identity,
      now,
    });

    if (proposed.isErr()) {
      return deny("forbidden", proposed.error.code, poll.correlationId);
    }

    // The proposal is the response: Blue parses one versioned envelope and
    // reads the outcome beside it.
    return buildSuccessResponse(
      "proposal" in proposed.value
        ? { ...proposed.value.proposal, outcome: proposed.value.outcome }
        : { outcome: proposed.value.outcome },
    );
  }

  if (confirmation) {
    const confirmed = receiveSiteRelationshipConfirmation(state, confirmation, {
      localIdentity: identity,
      now,
    });
    if (confirmed.isErr()) {
      return deny(
        "forbidden",
        confirmed.error.code,
        confirmation.correlationId,
      );
    }

    await kvsSiteRelationshipStore.write(confirmed.value.nextState);

    return buildSuccessResponse({ ...confirmed.value.receipt });
  }

  if (!nomination) {
    return deny("bad-request", "invalid-bootstrap-request");
  }

  const received = receiveSiteRelationshipNomination(state, nomination, {
    invitations: await kvsInvitationStore.read(),
    localSiteAri: identity.siteAri,
    now,
  });
  if (received.isErr()) {
    return deny("forbidden", received.error.code, nomination.correlationId);
  }

  await kvsSiteRelationshipStore.write(received.value.nextState);

  return buildSuccessResponse({ ...received.value.receipt });
});
