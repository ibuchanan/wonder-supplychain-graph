import { createForgeLogger } from "@forge-ahead/logging";

/** Shared structured logger for Forge runtime entry points. */
export const logger = createForgeLogger({
  // The logging wrapper replays Pino bindings into each record. Avoid the
  // optional Pino `name` binding so Forge receives each JSON field once.
  timestamp: "iso",
});
