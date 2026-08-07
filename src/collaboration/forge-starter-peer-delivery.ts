import type { types } from "@forge/teamwork-graph";
import { graph } from "@forge/teamwork-graph";

import { kvsDemoPairingStore } from "../pairing/kvs-demo-pairing-store";
import { kvsPackageConnectionStore } from "../projection/kvs-connection-store";
import {
  acceptStarterDelivery,
  type StarterDeliveryRequest,
} from "./starter-peer-delivery-contract";

interface WebTriggerRequest {
  readonly body?: string;
}

interface WebTriggerResponse {
  readonly body: string;
  readonly headers: { readonly "Content-Type": string };
  readonly statusCode: number;
}

function response(
  statusCode: number,
  body: Record<string, string>,
): WebTriggerResponse {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    statusCode,
  };
}

interface UntrustedStarterSourceEpic {
  readonly id?: unknown;
  readonly key?: unknown;
  readonly summary?: unknown;
  readonly updatedAt?: unknown;
  readonly url?: unknown;
}

interface UntrustedStarterDelivery {
  readonly correlationId?: unknown;
  readonly pairingId?: unknown;
  readonly protocolVersion?: unknown;
  readonly sourceEpic?: UntrustedStarterSourceEpic;
}

function isRecord(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function isStarterDeliveryRequest(
  value: unknown,
): value is StarterDeliveryRequest {
  if (!isRecord(value)) {
    return false;
  }

  const delivery = value as UntrustedStarterDelivery;
  const { sourceEpic } = delivery;

  return (
    typeof delivery.correlationId === "string" &&
    typeof delivery.pairingId === "string" &&
    delivery.protocolVersion === "v1" &&
    isRecord(sourceEpic) &&
    typeof sourceEpic.id === "string" &&
    typeof sourceEpic.key === "string" &&
    typeof sourceEpic.summary === "string" &&
    typeof sourceEpic.updatedAt === "string" &&
    typeof sourceEpic.url === "string"
  );
}

function parseStarterDelivery(
  request: WebTriggerRequest,
): StarterDeliveryRequest | undefined {
  if (!request.body) {
    return undefined;
  }

  try {
    const value: unknown = JSON.parse(request.body);
    return isStarterDeliveryRequest(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Receives a single direct starter delivery. The terminal is only a trigger;
 * this handler reads its own active connection and Pairing state from KVS and
 * never persists a candidate, receipt, version, or idempotency record.
 */
export async function receiveStarterDelivery(
  request: WebTriggerRequest,
): Promise<WebTriggerResponse> {
  const delivery = parseStarterDelivery(request);
  if (!delivery) {
    return response(400, { error: "invalid-starter-delivery" });
  }

  const [connectionId, pairingState] = await Promise.all([
    kvsPackageConnectionStore.getActiveConnectionId(),
    kvsDemoPairingStore.read(),
  ]);
  const result = acceptStarterDelivery(
    {
      ...(connectionId ? { connectionId } : {}),
      pairings: pairingState.pairings
        .filter(
          (pairing) =>
            pairing.role === "destination" &&
            pairing.connectionId === connectionId,
        )
        .map((pairing) => ({
          pairingId: pairing.pairingId,
          sourceEpicId: pairing.sourceEpicId,
          status: pairing.status,
        })),
    },
    delivery,
  );

  if (result.isErr()) {
    return response(409, { error: result.error.code });
  }

  const { document } = result.value;
  const object: types.DocumentObject = {
    "atlassian:document": {
      content: { mimeType: "text/plain", text: document.content },
      type: { category: "DOCUMENT" },
    },
    createdAt: delivery.sourceEpic.updatedAt,
    displayName: document.displayName,
    id: document.id,
    lastUpdatedAt: delivery.sourceEpic.updatedAt,
    permissions: [
      {
        accessControls: [{ principals: [{ type: "ATLASSIAN_WORKSPACE" }] }],
      },
    ],
    schemaVersion: "1.0",
    updateSequenceNumber: document.updateSequence,
    url: document.url,
  };
  const graphResult = await graph.setObjects({
    connectionId: result.value.connectionId,
    objects: [object],
  });

  if (!graphResult.success) {
    return response(502, { error: "graph-document-upsert-failed" });
  }

  return response(200, {
    connectionId: result.value.connectionId,
    correlationId: result.value.correlationId,
    outcome: result.value.outcome,
  });
}
