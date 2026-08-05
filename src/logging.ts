import { createForgeLogger } from "@forge-ahead/logging";

/** Shared structured logger for Forge runtime entry points. */
export const logger = createForgeLogger({
  name: "supplychain-graph",
  timestamp: "iso",
});
