import { err, ok, type Result } from "@forge-ahead/errors";

export interface DemoSourcePairing {
  readonly pairingId: string;
  readonly peerDeliveryUrl: string;
  readonly peerEventUrl: string;
  readonly role: "source";
  readonly sourceEpicKey: string;
  readonly sourceSiteAri: string;
  readonly sourceSiteUrl: string;
  readonly status: "active";
}

export interface DemoDestinationPairing {
  readonly automationWebhookUrl: string;
  readonly connectionId: string;
  readonly pairedEpicKey: string;
  readonly pairingId: string;
  readonly role: "destination";
  readonly sourceEpicKey: string;
  readonly status: "active";
}

export type DemoPairing = DemoDestinationPairing | DemoSourcePairing;

export interface DemoPairingState {
  readonly activeConnectionId?: string;
  readonly pairings: readonly DemoPairing[];
}

export interface SourceDemoPairingSeed {
  readonly pairingId: string;
  readonly peerDeliveryUrl: string;
  readonly peerEventUrl: string;
  readonly role: "source";
  readonly sourceEpicKey: string;
  readonly sourceSiteAri: string;
  readonly sourceSiteUrl: string;
}

export interface DestinationDemoPairingSeed {
  readonly automationWebhookUrl: string;
  readonly pairedEpicKey: string;
  readonly pairingId: string;
  readonly role: "destination";
  readonly sourceEpicKey: string;
}

export type DemoPairingSeed =
  | DestinationDemoPairingSeed
  | SourceDemoPairingSeed;

export interface DemoPairingSeedResult {
  readonly nextState: DemoPairingState;
}

export interface DestinationConnectionUnavailableError {
  readonly code: "destination-connection-unavailable";
}

export interface InvalidAutomationWebhookUrlError {
  readonly code: "invalid-automation-webhook-url";
}

export interface InvalidPeerEventUrlError {
  readonly code: "invalid-peer-event-url";
}

export interface InvalidSourceSiteUrlError {
  readonly code: "invalid-source-site-url";
}

export type DemoPairingSeedError =
  | DestinationConnectionUnavailableError
  | InvalidAutomationWebhookUrlError
  | InvalidPeerEventUrlError
  | InvalidSourceSiteUrlError;

function canonicalCapabilityUrl(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

function canonicalSourceSiteUrl(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }

    return url.origin;
  } catch {
    return undefined;
  }
}

function replacePairing(
  state: DemoPairingState,
  pairing: DemoPairing,
): DemoPairingSeedResult {
  const existingPairingIndex = state.pairings.findIndex(
    (candidate) => candidate.pairingId === pairing.pairingId,
  );

  return {
    nextState: {
      ...(state.activeConnectionId
        ? { activeConnectionId: state.activeConnectionId }
        : {}),
      pairings:
        existingPairingIndex === -1
          ? [...state.pairings, pairing]
          : state.pairings.map((candidate, index) =>
              index === existingPairingIndex ? pairing : candidate,
            ),
    },
  };
}

export function applyDemoPairingSeed(
  state: DemoPairingState,
  seed: DemoPairingSeed,
): Result<DemoPairingSeedResult, DemoPairingSeedError> {
  if (seed.role === "source") {
    const peerEventUrl = canonicalCapabilityUrl(seed.peerEventUrl);
    if (!peerEventUrl) {
      return err({ code: "invalid-peer-event-url" });
    }

    const sourceSiteUrl = canonicalSourceSiteUrl(seed.sourceSiteUrl);
    if (!sourceSiteUrl) {
      return err({ code: "invalid-source-site-url" });
    }

    return ok(
      replacePairing(state, {
        pairingId: seed.pairingId,
        peerDeliveryUrl: seed.peerDeliveryUrl,
        peerEventUrl,
        role: seed.role,
        sourceEpicKey: seed.sourceEpicKey,
        sourceSiteAri: seed.sourceSiteAri,
        sourceSiteUrl,
        status: "active",
      }),
    );
  }

  const automationWebhookUrl = canonicalCapabilityUrl(
    seed.automationWebhookUrl,
  );
  if (!automationWebhookUrl) {
    return err({ code: "invalid-automation-webhook-url" });
  }

  if (!state.activeConnectionId) {
    return err({ code: "destination-connection-unavailable" });
  }

  return ok(
    replacePairing(state, {
      automationWebhookUrl,
      connectionId: state.activeConnectionId,
      pairedEpicKey: seed.pairedEpicKey,
      pairingId: seed.pairingId,
      role: seed.role,
      sourceEpicKey: seed.sourceEpicKey,
      status: "active",
    }),
  );
}
