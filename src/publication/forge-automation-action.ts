import { kvs } from "@forge/kvs";

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

const publishDemoWorkPackage = createDemoPublishWorkPackageAction({
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
export async function publishWorkPackage(
  payload: PublishWorkPackageActionPayload,
) {
  return publishDemoWorkPackage(payload);
}
