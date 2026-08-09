import {
  buildSuccessResponse,
  defineWebTrigger,
  type WebTriggerEvent,
  type WebTriggerResponse,
} from "@forge-ahead/triggers/webtrigger";

import { logger } from "../logging";
import { kvsPackageConnectionStore } from "../projection/kvs-connection-store";
import {
  applyDemoPairingSeed,
  type DemoPairingSeed,
} from "./apply-demo-pairing-seed";
import { kvsDemoPairingStore } from "./kvs-demo-pairing-store";

function errorResponse(
  statusCode: number,
  body: Record<string, unknown>,
): WebTriggerResponse {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": ["application/json"] },
    statusCode,
  };
}

function parseSeed<T extends DemoPairingSeed>(
  request: WebTriggerEvent,
): T | undefined {
  if (!request.body) {
    return undefined;
  }

  try {
    return JSON.parse(request.body) as T;
  } catch {
    return undefined;
  }
}

async function seed(
  request: WebTriggerEvent,
  role: DemoPairingSeed["role"],
): Promise<WebTriggerResponse> {
  const { DEMO_PAIRING_SEED_ENABLED: demoPairingSeedEnabled } = process.env;
  if (demoPairingSeedEnabled !== "true") {
    return errorResponse(404, { error: "seed-not-enabled" });
  }

  const seedRequest = parseSeed<DemoPairingSeed>(request);
  if (!seedRequest || seedRequest.role !== role) {
    return errorResponse(400, { error: "invalid-seed-request" });
  }

  const state = await kvsDemoPairingStore.read();
  const activeConnectionId =
    await kvsPackageConnectionStore.getActiveConnectionId();
  const result = applyDemoPairingSeed(
    { ...state, ...(activeConnectionId ? { activeConnectionId } : {}) },
    seedRequest,
  );
  if (result.isErr()) {
    logger.info(
      {
        event: "scg.demo.pairing.seed.failed",
        reason: result.error.code,
        role,
      },
      "Supplychain Graph demo pairing seed failed",
    );
    return errorResponse(409, { error: result.error.code });
  }

  await kvsDemoPairingStore.write(result.value.nextState);
  logger.info(
    {
      event: "scg.demo.pairing.seed.completed",
      pairingId: seedRequest.pairingId,
      role,
    },
    "Supplychain Graph demo pairing seed completed",
  );
  return buildSuccessResponse({
    pairingId: seedRequest.pairingId,
    status: "active",
  });
}

export const seedSourcePairing = defineWebTrigger((request) =>
  seed(request, "source"),
);

export const seedDestinationPairing = defineWebTrigger((request) =>
  seed(request, "destination"),
);
