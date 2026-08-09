import { err, ok, type Result } from "@forge-ahead/errors";

import type { ProtocolVersion } from "./protocol";

export interface SourcePairing {
  readonly pairingId: string;
  readonly peerDeliveryUrl: string;
  readonly sourceEpicKey: string;
  readonly sourceSiteUrl: string;
  readonly status: "active" | "inactive";
}

export interface SourcePublicationState {
  readonly pairings: readonly SourcePairing[];
}

/** The source webtrigger accepts only its non-secret local Pairing identifier. */
export interface SourcePublicationRequest {
  readonly pairingId: string;
}

export interface StarterPublication {
  readonly pairingId: string;
  readonly peerDeliveryUrl: string;
  readonly sourceEpicKey: string;
  readonly sourceSiteUrl: string;
}

export interface SourcePairingUnavailableError {
  readonly code: "source-pairing-unavailable";
  readonly pairingId: string;
}

export function prepareStarterPublication(
  state: SourcePublicationState,
  request: SourcePublicationRequest,
): Result<StarterPublication, SourcePairingUnavailableError> {
  const pairing = state.pairings.find(
    (candidate) =>
      candidate.pairingId === request.pairingId &&
      candidate.status === "active",
  );

  if (!pairing) {
    return err({
      code: "source-pairing-unavailable",
      pairingId: request.pairingId,
    });
  }

  return ok({
    pairingId: pairing.pairingId,
    peerDeliveryUrl: pairing.peerDeliveryUrl,
    sourceEpicKey: pairing.sourceEpicKey,
    sourceSiteUrl: pairing.sourceSiteUrl,
  });
}

export interface DestinationPairing {
  readonly pairingId: string;
  readonly sourceEpicKey: string;
  readonly status: "active" | "inactive";
}

export interface DestinationDeliveryState {
  readonly connectionId?: string;
  readonly pairings: readonly DestinationPairing[];
}

export interface StarterSourceEpic {
  readonly createdAt?: string;
  readonly id: string;
  readonly key: string;
  readonly summary: string;
  readonly updatedAt: string;
  readonly url: string;
}

export interface StarterDeliveryRequest {
  readonly correlationId: string;
  readonly pairingId: string;
  readonly protocolVersion: ProtocolVersion;
  readonly sourceEpic: StarterSourceEpic;
}

export interface StarterDocument {
  readonly content: string;
  readonly displayName: string;
  readonly id: string;
  readonly updateSequence: number;
  readonly url: string;
}

export interface AcceptedStarterDelivery {
  readonly connectionId: string;
  readonly correlationId: string;
  readonly document: StarterDocument;
  readonly outcome: "accepted";
}

export interface DestinationConnectionUnavailableError {
  readonly code: "destination-connection-unavailable";
  readonly correlationId: string;
}

export interface DestinationPairingUnavailableError {
  readonly code: "destination-pairing-unavailable";
  readonly correlationId: string;
  readonly pairingId: string;
}

export interface InvalidStarterDeliveryError {
  readonly code: "invalid-starter-delivery";
  readonly correlationId: string;
}

export type StarterDeliveryError =
  | DestinationConnectionUnavailableError
  | DestinationPairingUnavailableError
  | InvalidStarterDeliveryError;

export function acceptStarterDelivery(
  state: DestinationDeliveryState,
  request: StarterDeliveryRequest,
): Result<AcceptedStarterDelivery, StarterDeliveryError> {
  if (!state.connectionId) {
    return err({
      code: "destination-connection-unavailable",
      correlationId: request.correlationId,
    });
  }

  const updateSequence = Date.parse(request.sourceEpic.updatedAt);
  if (Number.isNaN(updateSequence)) {
    return err({
      code: "invalid-starter-delivery",
      correlationId: request.correlationId,
    });
  }

  const pairing = state.pairings.find(
    (candidate) =>
      candidate.pairingId === request.pairingId &&
      candidate.sourceEpicKey === request.sourceEpic.key &&
      candidate.status === "active",
  );

  if (!pairing) {
    return err({
      code: "destination-pairing-unavailable",
      correlationId: request.correlationId,
      pairingId: request.pairingId,
    });
  }

  const displayName = `${request.sourceEpic.key}: ${request.sourceEpic.summary}`;

  return ok({
    connectionId: state.connectionId,
    correlationId: request.correlationId,
    document: {
      content: displayName,
      displayName,
      id: `${pairing.pairingId}:${request.sourceEpic.id}`,
      updateSequence,
      url: request.sourceEpic.url,
    },
    outcome: "accepted",
  });
}
