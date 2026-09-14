import { fetch } from "@forge/api";
import { kvs } from "@forge/kvs";

import type { LeanEvent } from "../collaboration/lean-event-contract";
import { signPeerRequest } from "../collaboration/peer-hmac-auth";
import { kvsPeerPairingStore } from "../pairing/kvs-peer-pairing-store";
import { createActionExecutionMetadata } from "./action-execution-metadata";
import type { PublicationState } from "./apply-command";
import {
  createDemoPublishWorkPackageAction,
  type PublishWorkPackageActionPayload,
} from "./automation-action";

function storageKey(sourceEpicId: string): string {
  return `demo-publication-state:${sourceEpicId}`;
}

function demoPublicationState(
  payload: PublishWorkPackageActionPayload,
): PublicationState {
  const pairingId = `demo-pairing:${payload.sourceEpicId}`;

  return {
    candidates: [],
    pairings: [
      {
        automationConnectionUserId: payload.publisherId,
        pairedEpicId: `demo-paired:${payload.sourceEpicId}`,
        pairingId,
        sourceEpicId: payload.sourceEpicId,
        status: "active",
      },
    ],
    processedIdempotencyKeys: [],
  };
}

async function emitLeanEvent(
  pairing: { readonly peerEventUrl: string },
  event: LeanEvent,
): Promise<void> {
  const body = JSON.stringify(event);
  const authentication = signPeerRequest(process.env["SHARED_SECRET"], body);
  if (!authentication) {
    throw new Error("Unable to emit lean event: invalid peer HMAC secret");
  }

  const response = await fetch(pairing.peerEventUrl, {
    body,
    headers: { "Content-Type": "application/json", ...authentication },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Unable to emit lean event: peer rejected delivery");
  }
}

const publishDemoWorkPackage = createDemoPublishWorkPackageAction({
  emitLeanEvent,
  resolveSourcePairing: async (payload) => {
    const { pairings } = await kvsPeerPairingStore.read();
    const pairing = pairings.find(
      (candidate) =>
        candidate.role === "source" &&
        candidate.status === "active" &&
        candidate.sourceEpicKey === payload.sourceEpicId,
    );
    return pairing?.role === "source" ? pairing : undefined;
  },
  initialState: demoPublicationState,
  store: {
    load: async (sourceEpicId) =>
      kvs.get<PublicationState>(storageKey(sourceEpicId)),
    save: async (sourceEpicId, state) => {
      await kvs.set(storageKey(sourceEpicId), state);
    },
  },
});

/**
 * Jira Automation entry point for the visual demo. The seed state is the only
 * handshake bypass: it is confined to this Forge adapter so the publication
 * core still applies its normal pairing, preflight, and idempotency rules.
 */
export interface PublishWorkPackageActionInput {
  readonly publisherId: string;
  readonly sourceEpicId: string;
}

export async function publishWorkPackage(
  payload: PublishWorkPackageActionInput,
) {
  return publishDemoWorkPackage({
    ...payload,
    ...createActionExecutionMetadata(payload.sourceEpicId),
  });
}
