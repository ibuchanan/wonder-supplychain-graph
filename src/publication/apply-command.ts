import { err, ok, type Result } from "@forge-ahead/errors";

import type { ProtocolVersion } from "../collaboration/protocol";

export interface PublicationPairing {
  readonly automationConnectionUserId: string;
  readonly pairedEpicId: string;
  readonly pairingId: string;
  readonly sourceEpicId: string;
  readonly status: "active";
}

export interface SnapshotCandidate {
  readonly candidateId: string;
  readonly correlationId: string;
  readonly pairedEpicId: string;
  readonly pairingId: string;
  readonly publisherId: string;
  readonly sourceEpicId: string;
  readonly state: "queued";
}

export interface PublicationState {
  readonly candidates: readonly SnapshotCandidate[];
  readonly pairings: readonly PublicationPairing[];
  readonly processedIdempotencyKeys: readonly string[];
}

export interface PublicationCommand {
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly operation: "snapshot.candidate.create";
  readonly pairingId: string;
  readonly preflight: {
    readonly publishingAuthority: "granted" | "denied";
    readonly schema: "invalid" | "valid";
    readonly sourceAccess: "denied" | "granted";
  };
  readonly protocolVersion: ProtocolVersion;
  readonly publisherId: string;
  readonly sourceEpicId: string;
}

export interface DeliveryRequest {
  readonly candidateId: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly operation: "snapshot.candidate.deliver";
  readonly pairingId: string;
  readonly protocolVersion: ProtocolVersion;
}

export interface PublicationCommandResult {
  readonly decision: {
    readonly candidateId: string;
    readonly idempotency: "applied" | "replayed";
    readonly state: "queued";
  };
  readonly deliveryRequests: readonly DeliveryRequest[];
  readonly nextState: PublicationState;
}

export interface InvalidPublicationPairingError {
  readonly code: "invalid-publication-pairing";
  readonly pairingId: string;
  readonly sourceEpicId: string;
}

export interface AutomationUserNotAuthorizedError {
  readonly code: "automation-user-not-authorized";
  readonly pairingId: string;
  readonly publisherId: string;
}

export interface InvalidSnapshotSchemaError {
  readonly code: "invalid-snapshot-schema";
  readonly pairingId: string;
  readonly sourceEpicId: string;
}

export interface SourceEpicAccessDeniedError {
  readonly code: "source-epic-access-denied";
  readonly sourceEpicId: string;
}

export interface PublishingAuthorityDeniedError {
  readonly code: "publishing-authority-denied";
  readonly publisherId: string;
}

export type PublicationCommandError =
  | AutomationUserNotAuthorizedError
  | InvalidPublicationPairingError
  | InvalidSnapshotSchemaError
  | PublishingAuthorityDeniedError
  | SourceEpicAccessDeniedError;

export function applyPublicationCommand(
  state: PublicationState,
  command: PublicationCommand,
): Result<PublicationCommandResult, PublicationCommandError> {
  const candidateId = `candidate:${command.idempotencyKey}`;

  if (state.processedIdempotencyKeys.includes(command.idempotencyKey)) {
    return ok({
      decision: {
        candidateId,
        idempotency: "replayed",
        state: "queued",
      },
      deliveryRequests: [],
      nextState: state,
    });
  }

  const pairing = state.pairings.find(
    (candidate) =>
      candidate.pairingId === command.pairingId &&
      candidate.sourceEpicId === command.sourceEpicId,
  );

  if (!pairing) {
    return err({
      code: "invalid-publication-pairing",
      pairingId: command.pairingId,
      sourceEpicId: command.sourceEpicId,
    });
  }

  if (pairing.automationConnectionUserId !== command.publisherId) {
    return err({
      code: "automation-user-not-authorized",
      pairingId: command.pairingId,
      publisherId: command.publisherId,
    });
  }

  if (command.preflight.sourceAccess !== "granted") {
    return err({
      code: "source-epic-access-denied",
      sourceEpicId: command.sourceEpicId,
    });
  }

  if (command.preflight.publishingAuthority !== "granted") {
    return err({
      code: "publishing-authority-denied",
      publisherId: command.publisherId,
    });
  }

  if (command.preflight.schema !== "valid") {
    return err({
      code: "invalid-snapshot-schema",
      pairingId: command.pairingId,
      sourceEpicId: command.sourceEpicId,
    });
  }

  const candidate: SnapshotCandidate = {
    candidateId,
    correlationId: command.correlationId,
    pairedEpicId: pairing.pairedEpicId,
    pairingId: command.pairingId,
    publisherId: command.publisherId,
    sourceEpicId: command.sourceEpicId,
    state: "queued",
  };
  const deliveryRequest: DeliveryRequest = {
    candidateId,
    correlationId: command.correlationId,
    idempotencyKey: command.idempotencyKey,
    operation: "snapshot.candidate.deliver",
    pairingId: command.pairingId,
    protocolVersion: command.protocolVersion,
  };

  return ok({
    decision: {
      candidateId,
      idempotency: "applied",
      state: "queued",
    },
    deliveryRequests: [deliveryRequest],
    nextState: {
      candidates: [...state.candidates, candidate],
      pairings: state.pairings,
      processedIdempotencyKeys: [
        ...state.processedIdempotencyKeys,
        command.idempotencyKey,
      ],
    },
  });
}
