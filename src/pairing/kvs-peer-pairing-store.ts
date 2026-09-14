import { kvs } from "@forge/kvs";

import type { PeerPairingState } from "./peer-pairing-state";

const peerPairingStateKey = "peer-pairing-state";
const emptyState: PeerPairingState = { pairings: [] };

export const kvsPeerPairingStore = {
  read: async (): Promise<PeerPairingState> =>
    (await kvs.get<PeerPairingState>(peerPairingStateKey)) ?? emptyState,
  write: async (state: PeerPairingState): Promise<void> => {
    await kvs.set(peerPairingStateKey, { pairings: state.pairings });
  },
};
