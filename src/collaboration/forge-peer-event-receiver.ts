import { fetch } from "@forge/api";
import {
  buildSuccessResponse,
  defineWebTrigger,
  type WebTriggerResponse,
} from "@forge-ahead/triggers/webtrigger";

import { kvsPeerPairingStore } from "../pairing/kvs-peer-pairing-store";
import {
  enrichLeanEventForAutomation,
  parseLeanEvent,
} from "./lean-event-contract";
import { verifyPeerRequest } from "./peer-hmac-auth";

function errorResponse(statusCode: number, error: string): WebTriggerResponse {
  return {
    body: JSON.stringify({ error }),
    headers: { "Content-Type": ["application/json"] },
    statusCode,
  };
}

/** Receives one authenticated peer CloudEvent and forwards its local enrichment to Automation. */
export const receivePeerEvent = defineWebTrigger(async (request) => {
  const authenticationError = verifyPeerRequest(
    request,
    process.env["SCG_P2P_POC_SECRET"],
  );
  if (authenticationError) {
    return errorResponse(401, authenticationError);
  }

  const event = request.body ? parseLeanEvent(request.body) : undefined;
  if (!event) {
    return errorResponse(400, "invalid-lean-event");
  }

  const { pairings } = await kvsPeerPairingStore.read();
  const pairing = pairings.find(
    (candidate) =>
      candidate.role === "destination" &&
      candidate.status === "active" &&
      candidate.pairingId === event.data.pairingId &&
      candidate.sourceEpicKey === event.data.issueKey,
  );
  if (pairing?.role !== "destination") {
    return errorResponse(409, "destination-pairing-unavailable");
  }

  try {
    const response = await fetch(pairing.automationWebhookUrl, {
      body: JSON.stringify(
        enrichLeanEventForAutomation(event, pairing.pairedEpicKey),
      ),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      return errorResponse(502, "automation-webhook-failed");
    }
  } catch {
    return errorResponse(502, "automation-webhook-failed");
  }

  return buildSuccessResponse({ outcome: "forwarded" });
});
