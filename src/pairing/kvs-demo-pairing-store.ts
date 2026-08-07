import { kvs } from "@forge/kvs";

import type { DemoPairingState } from "./apply-demo-pairing-seed";

const demoPairingStateKey = "demo-pairing-state";
const emptyState: DemoPairingState = { pairings: [] };

export const kvsDemoPairingStore = {
  read: async (): Promise<DemoPairingState> =>
    (await kvs.get<DemoPairingState>(demoPairingStateKey)) ?? emptyState,
  write: async (state: DemoPairingState): Promise<void> => {
    await kvs.set(demoPairingStateKey, { pairings: state.pairings });
  },
};
