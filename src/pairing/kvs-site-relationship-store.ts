import { kvs } from "@forge/kvs";

import type { SiteRelationshipSetupState } from "./site-relationship-nomination";

const siteRelationshipSetupStateKey = "site-relationship-setup-state";
const emptyState: SiteRelationshipSetupState = {
  nominations: [],
  processedIdempotencyKeys: [],
  relationships: [],
};

export const kvsSiteRelationshipStore = {
  read: async (): Promise<SiteRelationshipSetupState> =>
    (await kvs.get<SiteRelationshipSetupState>(
      siteRelationshipSetupStateKey,
    )) ?? emptyState,
  write: async (state: SiteRelationshipSetupState): Promise<void> => {
    await kvs.set(siteRelationshipSetupStateKey, state);
  },
};
