import { err, ok, type Result } from "@forge-ahead/errors";

import type { LeanEventDemoConfig } from "./run-lean-event-demo";

const requiredEnvironmentVariables = [
  "SCG_DESTINATION_AUTOMATION_WEBHOOK_URL",
  "SCG_DESTINATION_DELIVERY_URL",
  "SCG_DESTINATION_EVENT_URL",
  "SCG_DESTINATION_SEED_URL",
  "SCG_PAIRED_EPIC_KEY",
  "SCG_PAIRING_ID",
  "SCG_SOURCE_EPIC_KEY",
  "SCG_SOURCE_SEED_URL",
  "SCG_SOURCE_SITE",
  "SCG_SOURCE_SITE_ARI",
] as const;

export interface MissingLeanEventDemoEnvironmentError {
  readonly code: "missing-harness-environment";
  readonly names: readonly string[];
}

/** Reads local-only configuration for the direct Blue-to-Green event demo. */
export function readLeanEventDemoConfig(
  environment: NodeJS.ProcessEnv,
): Result<LeanEventDemoConfig, MissingLeanEventDemoEnvironmentError> {
  const missing = requiredEnvironmentVariables.filter(
    (name) => !environment[name],
  );
  if (missing.length > 0) {
    return err({ code: "missing-harness-environment", names: missing });
  }

  const value = (name: (typeof requiredEnvironmentVariables)[number]): string =>
    environment[name] as string;

  return ok({
    destinationAutomationWebhookUrl: value(
      "SCG_DESTINATION_AUTOMATION_WEBHOOK_URL",
    ),
    destinationDeliveryUrl: value("SCG_DESTINATION_DELIVERY_URL"),
    destinationEventUrl: value("SCG_DESTINATION_EVENT_URL"),
    destinationSeedUrl: value("SCG_DESTINATION_SEED_URL"),
    pairedEpicKey: value("SCG_PAIRED_EPIC_KEY"),
    pairingId: value("SCG_PAIRING_ID"),
    sourceEpicKey: value("SCG_SOURCE_EPIC_KEY"),
    sourceSeedUrl: value("SCG_SOURCE_SEED_URL"),
    sourceSiteAri: value("SCG_SOURCE_SITE_ARI"),
    sourceSiteUrl: new URL(`https://${value("SCG_SOURCE_SITE")}`).origin,
  });
}
