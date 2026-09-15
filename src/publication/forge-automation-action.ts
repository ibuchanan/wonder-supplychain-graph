import { fetch, getAppContext } from "@forge/api";
import { kvs } from "@forge/kvs";

import type { LeanEvent } from "../collaboration/lean-event-contract";
import { signPeerRequest } from "../collaboration/peer-hmac-auth";
import { buildPeerOperationEnvelope } from "../collaboration/peer-operation-envelope";
import { authorizePeerRoute } from "../collaboration/peer-route-authorization";
import { kvsPeerPairingStore } from "../pairing/kvs-peer-pairing-store";
import { kvsSiteRelationshipStore } from "../pairing/kvs-site-relationship-store";
import type { SourcePeerPairing } from "../pairing/peer-pairing-state";
import type { NominatedIdentity } from "../pairing/site-relationship-nomination";
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

/** This tenant's own identity, read from the authenticated Forge context. */
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
 * Sends one operation to the peer. Revocation and expiry block this tenant's
 * *send* authorization too, so the outbound path applies the same gate as the
 * receiving route rather than relying on the peer to refuse the delivery.
 */
async function emitLeanEvent(
  pairing: SourcePeerPairing,
  event: LeanEvent,
  idempotencyKey: string,
): Promise<void> {
  const senderIdentity = localIdentity();
  if (!senderIdentity) {
    throw new Error("Unable to emit lean event: local identity unavailable");
  }

  const { relationships } = await kvsSiteRelationshipStore.read();
  const now = new Date().toISOString();
  const relationship = relationships.find(
    (candidate) => candidate.relationshipId === pairing.relationshipId,
  );
  const authorized = authorizePeerRoute(relationships, [pairing], {
    counterpartSiteAri: relationship?.counterpartSiteAri ?? "",
    now,
    operation: "starter.delivery",
    pairingId: pairing.pairingId,
    relationshipId: pairing.relationshipId,
    role: "source",
    sourceEpicKey: event.data.issueKey,
  });
  if (authorized.isErr() || !relationship) {
    throw new Error(
      `Unable to emit lean event: ${authorized.isErr() ? authorized.error.code : "relationship-unauthorized"}`,
    );
  }

  const body = JSON.stringify(
    buildPeerOperationEnvelope({
      createdAt: now,
      event,
      idempotencyKey,
      intendedReceiverSiteAri: relationship.counterpartSiteAri,
      operation: "starter.delivery",
      pairingId: pairing.pairingId,
      relationshipId: pairing.relationshipId,
      // Fresh per attempt: a retry must never reuse a consumed request ID.
      requestId: globalThis.crypto.randomUUID(),
      senderIdentity,
      termsVersion: relationship.termsVersion,
    }),
  );
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
