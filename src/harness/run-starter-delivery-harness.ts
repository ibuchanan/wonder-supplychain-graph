import { err, ok, type Result } from "@forge-ahead/errors";

export interface StarterDeliveryHarnessConfig {
  readonly destinationDeliveryUrl: string;
  readonly destinationSeedUrl: string;
  readonly pairedEpicKey: string;
  readonly pairingId: string;
  readonly sourceEpicKey: string;
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
    readonly text: () => Promise<string>;
  }>;
}

export type StarterDeliveryHarnessError =
  | {
      readonly code: "invalid-publication-result";
    }
  | {
      readonly code: "request-failed";
      readonly detail?: string;
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

function detailFromBody(body: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed !== "object" || parsed === null) {
      return undefined;
    }

    const value = parsed as {
      detail?: unknown;
      error?: unknown;
      message?: unknown;
    };
    const detail =
      typeof value.detail === "string"
        ? value.detail
        : typeof value.error === "string"
          ? value.error
          : typeof value.message === "string"
            ? value.message
            : undefined;
    return detail?.slice(0, 500);
  } catch {
    return undefined;
  }
}

async function requestFailure(
  response: Awaited<ReturnType<StarterDeliveryHarnessHttp["post"]>>,
  step: "destination-seed" | "source-publication" | "source-seed",
): Promise<StarterDeliveryHarnessError> {
  const detail = detailFromBody(await response.text());
  return {
    code: "request-failed",
    ...(detail ? { detail } : {}),
    status: response.status,
    step,
  };
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
    pairedEpicKey: config.pairedEpicKey,
    pairingId: config.pairingId,
    role: "destination",
    sourceEpicKey: config.sourceEpicKey,
  });
  if (!isSuccessful(destinationSeed.status)) {
    return err(await requestFailure(destinationSeed, "destination-seed"));
  }

  const sourceSeed = await http.post(config.sourceSeedUrl, {
    pairingId: config.pairingId,
    peerDeliveryUrl: config.destinationDeliveryUrl,
    role: "source",
    sourceEpicKey: config.sourceEpicKey,
  });
  if (!isSuccessful(sourceSeed.status)) {
    return err(await requestFailure(sourceSeed, "source-seed"));
  }

  const sourcePublication = await http.post(config.sourcePublicationUrl, {
    pairingId: config.pairingId,
  });
  if (!isSuccessful(sourcePublication.status)) {
    return err(await requestFailure(sourcePublication, "source-publication"));
  }

  const evidence = await sourcePublication.json();
  return isDeliveryEvidence(evidence)
    ? ok(evidence)
    : err({ code: "invalid-publication-result" });
}
