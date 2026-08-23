import { fetch } from "@forge/api";
import {
  buildSuccessResponse,
  defineWebTrigger,
  type WebTriggerResponse,
} from "@forge-ahead/triggers/webtrigger";

import { kvsDemoPairingStore } from "../pairing/kvs-demo-pairing-store";
import {
  enrichLeanEventForAutomation,
  parseLeanEvent,
} from "./lean-event-contract";

function errorResponse(statusCode: number, error: string): WebTriggerResponse {
  return {
    body: JSON.stringify({ error }),
    headers: { "Content-Type": ["application/json"] },
    statusCode,
  };
}

/** Receives one Blue event and forwards its Green-local enrichment to Automation. */
export const receiveLeanEvent = defineWebTrigger(async (request) => {
  const event = request.body ? parseLeanEvent(request.body) : undefined;
  if (!event) {
    return errorResponse(400, "invalid-lean-event");
  }

  const { pairings } = await kvsDemoPairingStore.read();
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
