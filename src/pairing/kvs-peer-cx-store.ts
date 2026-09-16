import { kvs } from "@forge/kvs";

import type { PeerCxSetupState } from "./peer-cx-nomination";

const peerCxSetupStateKey = "peer-cx-setup-state";
const emptyState: PeerCxSetupState = {
  nominations: [],
  processedIdempotencyKeys: [],
  peerCxs: [],
};

export const kvsPeerCxStore = {
  read: async (): Promise<PeerCxSetupState> =>
    (await kvs.get<PeerCxSetupState>(peerCxSetupStateKey)) ?? emptyState,
  write: async (state: PeerCxSetupState): Promise<void> => {
    await kvs.set(peerCxSetupStateKey, state);
  },
};
