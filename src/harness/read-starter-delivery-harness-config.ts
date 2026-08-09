import { err, ok, type Result } from "@forge-ahead/errors";

import type { StarterDeliveryHarnessConfig } from "./run-starter-delivery-harness";

const requiredEnvironmentVariables = [
  "SCG_DESTINATION_DELIVERY_URL",
  "SCG_DESTINATION_SEED_URL",
  "SCG_DESTINATION_SITE",
  "SCG_PAIRED_EPIC_KEY",
  "SCG_PAIRING_ID",
  "SCG_SOURCE_EPIC_KEY",
  "SCG_SOURCE_PUBLICATION_URL",
  "SCG_SOURCE_SITE",
  "SCG_SOURCE_SEED_URL",
] as const;

export interface MissingHarnessEnvironmentError {
  readonly code: "missing-harness-environment";
  readonly names: readonly string[];
}

/** Reads all harness inputs from the caller's local environment. */
export function readStarterDeliveryHarnessConfig(
  environment: NodeJS.ProcessEnv,
): Result<StarterDeliveryHarnessConfig, MissingHarnessEnvironmentError> {
  const missing = requiredEnvironmentVariables.filter(
    (name) => !environment[name],
  );
  if (missing.length > 0) {
    return err({ code: "missing-harness-environment", names: missing });
  }

  const value = (name: (typeof requiredEnvironmentVariables)[number]): string =>
    environment[name] as string;

  return ok({
    destinationDeliveryUrl: value("SCG_DESTINATION_DELIVERY_URL"),
    destinationSeedUrl: value("SCG_DESTINATION_SEED_URL"),
    destinationSite: value("SCG_DESTINATION_SITE"),
    pairedEpicKey: value("SCG_PAIRED_EPIC_KEY"),
    pairingId: value("SCG_PAIRING_ID"),
    sourceEpicKey: value("SCG_SOURCE_EPIC_KEY"),
    sourcePublicationUrl: value("SCG_SOURCE_PUBLICATION_URL"),
    sourceSiteUrl: new URL(`https://${value("SCG_SOURCE_SITE")}`).origin,
    sourceSeedUrl: value("SCG_SOURCE_SEED_URL"),
  });
}
