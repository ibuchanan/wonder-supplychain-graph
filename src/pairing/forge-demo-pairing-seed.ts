import { logger } from "../logging";
import { kvsPackageConnectionStore } from "../projection/kvs-connection-store";
import {
  applyDemoPairingSeed,
  type DemoPairingSeed,
} from "./apply-demo-pairing-seed";
import { kvsDemoPairingStore } from "./kvs-demo-pairing-store";

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
  body: Record<string, unknown>,
): WebTriggerResponse {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    statusCode,
  };
}

function parseSeed<T extends DemoPairingSeed>(
  request: WebTriggerRequest,
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
  request: WebTriggerRequest,
  role: DemoPairingSeed["role"],
): Promise<WebTriggerResponse> {
  if (process.env["DEMO_PAIRING_SEED_ENABLED"] !== "true") {
    return response(404, { error: "seed-not-enabled" });
  }

  const seedRequest = parseSeed<DemoPairingSeed>(request);
  if (!seedRequest || seedRequest.role !== role) {
    return response(400, { error: "invalid-seed-request" });
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
    return response(409, { error: result.error.code });
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
  return response(200, { pairingId: seedRequest.pairingId, status: "active" });
}

export async function seedSourcePairing(request: WebTriggerRequest) {
  return seed(request, "source");
}

export async function seedDestinationPairing(request: WebTriggerRequest) {
  return seed(request, "destination");
}
