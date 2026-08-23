import { err, ok, type Result } from "@forge-ahead/errors";

export interface LeanEventDemoConfig {
  readonly destinationAutomationWebhookUrl: string;
  readonly destinationDeliveryUrl: string;
  readonly destinationEventUrl: string;
  readonly destinationSeedUrl: string;
  readonly pairedEpicKey: string;
  readonly pairingId: string;
  readonly sourceEpicKey: string;
  readonly sourceSeedUrl: string;
  readonly sourceSiteAri: string;
  readonly sourceSiteUrl: string;
}

export interface LeanEventDemoEvidence {
  readonly nextStep: string;
  readonly outcome: "ready-for-blue-automation-action";
  readonly pairedEpicKey: string;
  readonly sourceEpicKey: string;
}

export interface LeanEventDemoHttp {
  post(
    url: string,
    body: Record<string, string>,
  ): Promise<{ readonly status: number }>;
}

export interface LeanEventDemoRequestFailedError {
  readonly code: "request-failed";
  readonly status: number;
  readonly step: "destination-seed" | "source-seed";
}

function isSuccessful(status: number): boolean {
  return status >= 200 && status < 300;
}

function requestFailure(
  response: Awaited<ReturnType<LeanEventDemoHttp["post"]>>,
  step: LeanEventDemoRequestFailedError["step"],
): LeanEventDemoRequestFailedError {
  return { code: "request-failed", status: response.status, step };
}

/** Seeds both tenants, then leaves the Jira Automation action as the explicit manual demo step. */
export async function runLeanEventDemo(
  config: LeanEventDemoConfig,
  http: LeanEventDemoHttp,
): Promise<Result<LeanEventDemoEvidence, LeanEventDemoRequestFailedError>> {
  const destinationSeed = await http.post(config.destinationSeedUrl, {
    automationWebhookUrl: config.destinationAutomationWebhookUrl,
    pairedEpicKey: config.pairedEpicKey,
    pairingId: config.pairingId,
    role: "destination",
    sourceEpicKey: config.sourceEpicKey,
  });
  if (!isSuccessful(destinationSeed.status)) {
    return err(requestFailure(destinationSeed, "destination-seed"));
  }

  const sourceSeed = await http.post(config.sourceSeedUrl, {
    pairingId: config.pairingId,
    peerDeliveryUrl: config.destinationDeliveryUrl,
    peerEventUrl: config.destinationEventUrl,
    role: "source",
    sourceEpicKey: config.sourceEpicKey,
    sourceSiteAri: config.sourceSiteAri,
    sourceSiteUrl: config.sourceSiteUrl,
  });
  if (!isSuccessful(sourceSeed.status)) {
    return err(requestFailure(sourceSeed, "source-seed"));
  }

  return ok({
    nextStep: `Run the Blue Publish work package Automation Action for ${config.sourceEpicKey}.`,
    outcome: "ready-for-blue-automation-action",
    pairedEpicKey: config.pairedEpicKey,
    sourceEpicKey: config.sourceEpicKey,
  });
}
