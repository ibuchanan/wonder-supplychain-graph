import { getAppContext } from "@forge/api";
import {
  buildSuccessResponse,
  defineWebTrigger,
  type WebTriggerResponse,
} from "@forge-ahead/triggers/webtrigger";

import { verifyPeerRequest } from "../collaboration/peer-hmac-auth";
import { kvsInvitationStore } from "./kvs-invitation-store";
import { kvsSiteRelationshipStore } from "./kvs-site-relationship-store";
import { parseNominationRequest } from "./parse-nomination-request";
import { receiveSiteRelationshipNomination } from "./site-relationship-nomination";

function errorResponse(statusCode: number, error: string): WebTriggerResponse {
  return {
    body: JSON.stringify({ error }),
    headers: { "Content-Type": ["application/json"] },
    statusCode,
  };
}

/** Green's own site identity, never a peer-supplied claim. */
function localSiteAri(): string | undefined {
  const cloudId = getAppContext().installation?.contexts.find(
    (installationContext) => installationContext.cloudId,
  )?.cloudId;

  return cloudId ? `ari:cloud:jira::site/${cloudId}` : undefined;
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

  const nomination = request.body
    ? parseNominationRequest(request.body)
    : undefined;
  if (!nomination) {
    return errorResponse(400, "invalid-nomination-request");
  }

  const siteAri = localSiteAri();
  if (!siteAri) {
    return errorResponse(409, "local-identity-unavailable");
  }

  const [state, invitations] = await Promise.all([
    kvsSiteRelationshipStore.read(),
    kvsInvitationStore.read(),
  ]);
  const received = receiveSiteRelationshipNomination(state, nomination, {
    invitations,
    localSiteAri: siteAri,
    now: new Date().toISOString(),
  });
  if (received.isErr()) {
    return errorResponse(409, received.error.code);
  }

  await kvsSiteRelationshipStore.write(received.value.nextState);

  return buildSuccessResponse({ ...received.value.receipt });
});
