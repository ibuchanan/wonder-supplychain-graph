import { err, ok, type Result } from "@forge-ahead/errors";

export interface StarterDeliveryHarnessConfig {
  readonly destinationDeliveryUrl: string;
  readonly destinationSeedUrl: string;
  readonly pairedEpicId: string;
  readonly pairingId: string;
  readonly sourceEpicId: string;
  readonly sourcePublicationUrl: string;
  readonly sourceSeedUrl: string;
}

export interface StarterDeliveryEvidence {
  readonly correlationId: string;
  readonly documentId: string;
  readonly objectCount: number;
  readonly outcome: "delivered";
  readonly sourceEpicKey: string;
  readonly updateSequence: number;
}

export interface StarterDeliveryHarnessHttp {
  post(
    url: string,
    body: Record<string, string>,
  ): Promise<{
    readonly json: () => Promise<unknown>;
    readonly status: number;
  }>;
}

export type StarterDeliveryHarnessError =
  | {
      readonly code: "invalid-publication-result";
    }
  | {
      readonly code: "request-failed";
      readonly status: number;
      readonly step: "destination-seed" | "source-publication" | "source-seed";
    };

function isSuccessful(status: number): boolean {
  return status >= 200 && status < 300;
}

function isDeliveryEvidence(value: unknown): value is StarterDeliveryEvidence {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<StarterDeliveryEvidence>;
  return (
    typeof candidate.correlationId === "string" &&
    typeof candidate.documentId === "string" &&
    typeof candidate.objectCount === "number" &&
    candidate.outcome === "delivered" &&
    typeof candidate.sourceEpicKey === "string" &&
    typeof candidate.updateSequence === "number"
  );
}

/**
 * Runs the controlled starter-delivery demonstration without reading source
 * content or exposing peer credentials. The Forge runtimes perform the direct
 * delivery; the harness only invokes their public development webtriggers.
 */
export async function runStarterDeliveryHarness(
  config: StarterDeliveryHarnessConfig,
  http: StarterDeliveryHarnessHttp,
): Promise<Result<StarterDeliveryEvidence, StarterDeliveryHarnessError>> {
  const destinationSeed = await http.post(config.destinationSeedUrl, {
    pairedEpicId: config.pairedEpicId,
    pairingId: config.pairingId,
    role: "destination",
    sourceEpicId: config.sourceEpicId,
  });
  if (!isSuccessful(destinationSeed.status)) {
    return err({
      code: "request-failed",
      status: destinationSeed.status,
      step: "destination-seed",
    });
  }

  const sourceSeed = await http.post(config.sourceSeedUrl, {
    pairingId: config.pairingId,
    peerDeliveryUrl: config.destinationDeliveryUrl,
    role: "source",
    sourceEpicId: config.sourceEpicId,
  });
  if (!isSuccessful(sourceSeed.status)) {
    return err({
      code: "request-failed",
      status: sourceSeed.status,
      step: "source-seed",
    });
  }

  const sourcePublication = await http.post(config.sourcePublicationUrl, {
    pairingId: config.pairingId,
  });
  if (!isSuccessful(sourcePublication.status)) {
    return err({
      code: "request-failed",
      status: sourcePublication.status,
      step: "source-publication",
    });
  }

  const evidence = await sourcePublication.json();
  return isDeliveryEvidence(evidence)
    ? ok(evidence)
    : err({ code: "invalid-publication-result" });
}
