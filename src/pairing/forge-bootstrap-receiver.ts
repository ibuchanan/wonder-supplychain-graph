import { getAppContext } from "@forge/api";
import {
  buildSuccessResponse,
  defineWebTrigger,
  type WebTriggerResponse,
} from "@forge-ahead/triggers/webtrigger";

import { verifyPeerRequest } from "../collaboration/peer-hmac-auth";
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

function errorResponse(statusCode: number, error: string): WebTriggerResponse {
  return {
    body: JSON.stringify({ error }),
    headers: { "Content-Type": ["application/json"] },
    statusCode,
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
    return errorResponse(401, authenticationError);
  }

  const body = request.body ?? "";
  const nomination = parseNominationRequest(body);
  const poll = parseActivationPollRequest(body);
  const confirmation = parseConfirmationRequest(body);
  if (!nomination && !poll && !confirmation) {
    return errorResponse(400, "invalid-bootstrap-request");
  }

  const identity = localIdentity();
  if (!identity) {
    return errorResponse(409, "local-identity-unavailable");
  }

  const now = new Date().toISOString();
  const state = await kvsSiteRelationshipStore.read();

  if (poll) {
    const proposed = proposeSiteRelationshipActivation(state, poll, {
      localIdentity: identity,
      now,
    });

    if (proposed.isErr()) {
      return errorResponse(409, proposed.error.code);
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
      return errorResponse(409, confirmed.error.code);
    }

    await kvsSiteRelationshipStore.write(confirmed.value.nextState);

    return buildSuccessResponse({ ...confirmed.value.receipt });
  }

  if (!nomination) {
    return errorResponse(400, "invalid-bootstrap-request");
  }

  const received = receiveSiteRelationshipNomination(state, nomination, {
    invitations: await kvsInvitationStore.read(),
    localSiteAri: identity.siteAri,
    now,
  });
  if (received.isErr()) {
    return errorResponse(409, received.error.code);
  }

  await kvsSiteRelationshipStore.write(received.value.nextState);

  return buildSuccessResponse({ ...received.value.receipt });
});
