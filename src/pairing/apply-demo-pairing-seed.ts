import { err, ok, type Result } from "@forge-ahead/errors";

export interface DemoSourcePairing {
  readonly pairingId: string;
  readonly peerDeliveryUrl: string;
  readonly role: "source";
  readonly sourceEpicKey: string;
  readonly status: "active";
}

export interface DemoDestinationPairing {
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
  readonly role: "source";
  readonly sourceEpicKey: string;
}

export interface DestinationDemoPairingSeed {
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

export function applyDemoPairingSeed(
  state: DemoPairingState,
  seed: DemoPairingSeed,
): Result<DemoPairingSeedResult, DestinationConnectionUnavailableError> {
  if (seed.role === "destination" && !state.activeConnectionId) {
    return err({ code: "destination-connection-unavailable" });
  }

  const pairing: DemoPairing =
    seed.role === "source"
      ? {
          pairingId: seed.pairingId,
          peerDeliveryUrl: seed.peerDeliveryUrl,
          role: seed.role,
          sourceEpicKey: seed.sourceEpicKey,
          status: "active",
        }
      : {
          connectionId: state.activeConnectionId as string,
          pairedEpicKey: seed.pairedEpicKey,
          pairingId: seed.pairingId,
          role: seed.role,
          sourceEpicKey: seed.sourceEpicKey,
          status: "active",
        };
  const existingPairingIndex = state.pairings.findIndex(
    (candidate) => candidate.pairingId === seed.pairingId,
  );

  return ok({
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
  });
}
