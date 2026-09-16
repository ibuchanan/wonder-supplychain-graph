import { err, ok, type Result } from "@forge-ahead/errors";

import type { ProtocolVersion } from "./protocol";

export type PairingRequestStatus = "pending" | "accepted";

export interface PairingRequest {
  readonly correlationId: string;
  readonly pairingRequestId: string;
  readonly pairingId: string;
  readonly status: PairingRequestStatus;
}

export interface CollaborationState {
  readonly pairingRequests: readonly PairingRequest[];
  readonly processedIdempotencyKeys: readonly string[];
}

export interface PairingRequestAcceptanceCommand {
  readonly acceptedAt: string;
  readonly actor: "supplier-administrator";
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly pairingRequestId: string;
  readonly operation: "pairing.request.accept";
  readonly pairingId: string;
  readonly protocolVersion: ProtocolVersion;
}

export interface PairingAcceptedAuditEvent {
  readonly actor: "supplier-administrator";
  readonly correlationId: string;
  readonly eventId: string;
  readonly eventType: "pairing.accepted";
  readonly idempotencyKey: string;
  readonly occurredAt: string;
  readonly pairingId: string;
  readonly protocolVersion: ProtocolVersion;
}

export interface CollaborationCommandResult {
  readonly auditEvents: readonly PairingAcceptedAuditEvent[];
  readonly decision: {
    readonly idempotency: "applied" | "replayed";
    readonly pairingId: string;
    readonly status: "active";
  };
  readonly nextState: CollaborationState;
}

export interface PendingPairingRequestNotFoundError {
  readonly code: "pending-pairing-request-not-found";
  readonly correlationId: string;
  readonly pairingRequestId: string;
  readonly pairingId: string;
}

export type CollaborationCommandError = PendingPairingRequestNotFoundError;

export function applyCollaborationCommand(
  state: CollaborationState,
  command: PairingRequestAcceptanceCommand,
): Result<CollaborationCommandResult, CollaborationCommandError> {
  if (state.processedIdempotencyKeys.includes(command.idempotencyKey)) {
    return ok({
      auditEvents: [],
      decision: {
        idempotency: "replayed",
        pairingId: command.pairingId,
        status: "active",
      },
      nextState: state,
    });
  }

  const pairingRequest = state.pairingRequests.find(
    (candidate) =>
      candidate.pairingRequestId === command.pairingRequestId &&
      candidate.pairingId === command.pairingId &&
      candidate.correlationId === command.correlationId,
  );

  if (pairingRequest?.status !== "pending") {
    return err({
      code: "pending-pairing-request-not-found",
      correlationId: command.correlationId,
      pairingRequestId: command.pairingRequestId,
      pairingId: command.pairingId,
    });
  }

  const auditEvent = Object.freeze({
    actor: command.actor,
    correlationId: command.correlationId,
    eventId: `audit:${command.idempotencyKey}`,
    eventType: "pairing.accepted" as const,
    idempotencyKey: command.idempotencyKey,
    occurredAt: command.acceptedAt,
    pairingId: command.pairingId,
    protocolVersion: command.protocolVersion,
  });

  return ok({
    auditEvents: [auditEvent],
    decision: {
      idempotency: "applied",
      pairingId: command.pairingId,
      status: "active",
    },
    nextState: {
      pairingRequests: state.pairingRequests.map((candidate) =>
        candidate.pairingRequestId === pairingRequest.pairingRequestId
          ? { ...candidate, status: "accepted" }
          : candidate,
      ),
      processedIdempotencyKeys: [
        ...state.processedIdempotencyKeys,
        command.idempotencyKey,
      ],
    },
  });
}
