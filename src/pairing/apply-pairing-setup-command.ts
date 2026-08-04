import { err, ok, type Result } from "@forge-ahead/errors";

import type { InvitationAcceptanceCommand } from "../collaboration/apply-command";
import type { ProtocolVersion } from "../collaboration/protocol";

export interface LocalPairing {
  readonly correlationId: string;
  readonly pairedEpicLocalId?: string;
  readonly pairingId: string;
  readonly role: "manufacturer" | "supplier";
  readonly sourceEpicLocalId?: string;
  readonly status:
    | "accepted-awaiting-peer-application"
    | "active"
    | "awaiting-supplier-acceptance";
}

export interface PairingSetupState {
  readonly consumedPairingReferenceIds?: readonly string[];
  readonly localPairings: readonly LocalPairing[];
  readonly processedIdempotencyKeys: readonly string[];
}

export interface PairingInitiationCommand {
  readonly actor: "manufacturer-administrator";
  readonly appEnvironment: string;
  readonly correlationId: string;
  readonly createdAt: string;
  readonly idempotencyKey: string;
  readonly manufacturerSiteName: string;
  readonly operation: "pairing.initiate";
  readonly pairingId: string;
  readonly pairingReferenceId: string;
  readonly protocolVersion: ProtocolVersion;
  readonly sourceEpicLocalId: string;
}

export interface PairingAcceptanceCommand {
  readonly acceptedAt: string;
  readonly actor: "supplier-administrator";
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly invitationId: string;
  readonly operation: "pairing.accept";
  readonly pairedEpicLocalId: string;
  readonly pairingId: string;
  readonly pairingReferenceId: string;
  readonly protocolVersion: ProtocolVersion;
}

export interface PeerAcceptanceApplicationCommand {
  readonly actor: "manufacturer-system";
  readonly appliedAt: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly operation: "pairing.apply-peer-acceptance";
  readonly pairingId: string;
  readonly protocolVersion: ProtocolVersion;
}

export interface PairingReference {
  readonly appEnvironment: string;
  readonly correlationId: string;
  readonly manufacturerSiteName: string;
  readonly pairingReferenceId: string;
  readonly purpose: "establish-pairing";
}

export interface PairingInitiatedAuditEvent {
  readonly actor: "manufacturer-administrator";
  readonly correlationId: string;
  readonly eventId: string;
  readonly eventType: "pairing.initiated";
  readonly idempotencyKey: string;
  readonly occurredAt: string;
  readonly pairingId: string;
  readonly protocolVersion: ProtocolVersion;
}

export interface PairingAcceptedLocallyAuditEvent {
  readonly actor: "supplier-administrator";
  readonly correlationId: string;
  readonly eventId: string;
  readonly eventType: "pairing.accepted-locally";
  readonly idempotencyKey: string;
  readonly occurredAt: string;
  readonly pairingId: string;
  readonly protocolVersion: ProtocolVersion;
}

export interface PairingActivatedAuditEvent {
  readonly actor: "manufacturer-system";
  readonly correlationId: string;
  readonly eventId: string;
  readonly eventType: "pairing.activated";
  readonly idempotencyKey: string;
  readonly occurredAt: string;
  readonly pairingId: string;
  readonly protocolVersion: ProtocolVersion;
}

export interface PairingInitiationResult {
  readonly auditEvents: readonly PairingInitiatedAuditEvent[];
  readonly nextState: PairingSetupState;
  readonly pairingReference: PairingReference;
}

export interface PairingAcceptanceResult {
  readonly auditEvents: readonly PairingAcceptedLocallyAuditEvent[];
  readonly nextState: PairingSetupState;
  readonly outboundAcceptance: InvitationAcceptanceCommand;
}

export interface PairingActivationResult {
  readonly auditEvents: readonly PairingActivatedAuditEvent[];
  readonly nextState: PairingSetupState;
}

export type PairingSetupResult =
  | PairingAcceptanceResult
  | PairingActivationResult
  | PairingInitiationResult;

export type PairingSetupError =
  | {
      readonly code: "pairing-reference-already-used";
      readonly pairingReferenceId: string;
    }
  | {
      readonly code: "pending-manufacturer-pairing-not-found";
      readonly correlationId: string;
      readonly pairingId: string;
    };

export function applyPairingSetupCommand(
  state: PairingSetupState,
  command: PairingInitiationCommand,
): Result<PairingInitiationResult, PairingSetupError>;
export function applyPairingSetupCommand(
  state: PairingSetupState,
  command: PairingAcceptanceCommand,
): Result<PairingAcceptanceResult, PairingSetupError>;
export function applyPairingSetupCommand(
  state: PairingSetupState,
  command: PeerAcceptanceApplicationCommand,
): Result<PairingActivationResult, PairingSetupError>;
export function applyPairingSetupCommand(
  state: PairingSetupState,
  command:
    | PairingAcceptanceCommand
    | PairingInitiationCommand
    | PeerAcceptanceApplicationCommand,
): Result<PairingSetupResult, PairingSetupError> {
  if (command.operation === "pairing.apply-peer-acceptance") {
    const pairing = state.localPairings.find(
      (candidate) =>
        candidate.correlationId === command.correlationId &&
        candidate.pairingId === command.pairingId &&
        candidate.role === "manufacturer" &&
        candidate.status === "awaiting-supplier-acceptance",
    );

    if (!pairing) {
      return err({
        code: "pending-manufacturer-pairing-not-found",
        correlationId: command.correlationId,
        pairingId: command.pairingId,
      });
    }

    const auditEvent = Object.freeze({
      actor: command.actor,
      correlationId: command.correlationId,
      eventId: `audit:${command.idempotencyKey}`,
      eventType: "pairing.activated" as const,
      idempotencyKey: command.idempotencyKey,
      occurredAt: command.appliedAt,
      pairingId: command.pairingId,
      protocolVersion: command.protocolVersion,
    });

    return ok({
      auditEvents: [auditEvent],
      nextState: {
        localPairings: state.localPairings.map((candidate) =>
          candidate === pairing
            ? { ...candidate, status: "active" }
            : candidate,
        ),
        processedIdempotencyKeys: [
          ...state.processedIdempotencyKeys,
          command.idempotencyKey,
        ],
      },
    });
  }

  if (command.operation === "pairing.accept") {
    if (
      state.consumedPairingReferenceIds?.includes(command.pairingReferenceId)
    ) {
      return err({
        code: "pairing-reference-already-used",
        pairingReferenceId: command.pairingReferenceId,
      });
    }

    const auditEvent = Object.freeze({
      actor: command.actor,
      correlationId: command.correlationId,
      eventId: `audit:${command.idempotencyKey}`,
      eventType: "pairing.accepted-locally" as const,
      idempotencyKey: command.idempotencyKey,
      occurredAt: command.acceptedAt,
      pairingId: command.pairingId,
      protocolVersion: command.protocolVersion,
    });

    return ok({
      auditEvents: [auditEvent],
      nextState: {
        consumedPairingReferenceIds: [
          ...(state.consumedPairingReferenceIds ?? []),
          command.pairingReferenceId,
        ],
        localPairings: [
          ...state.localPairings,
          {
            correlationId: command.correlationId,
            pairedEpicLocalId: command.pairedEpicLocalId,
            pairingId: command.pairingId,
            role: "supplier",
            status: "accepted-awaiting-peer-application",
          },
        ],
        processedIdempotencyKeys: [
          ...state.processedIdempotencyKeys,
          command.idempotencyKey,
        ],
      },
      outboundAcceptance: {
        acceptedAt: command.acceptedAt,
        actor: command.actor,
        correlationId: command.correlationId,
        idempotencyKey: command.idempotencyKey,
        invitationId: command.invitationId,
        operation: "invitation.accept",
        pairingId: command.pairingId,
        protocolVersion: command.protocolVersion,
      },
    });
  }

  const pairingReference = Object.freeze({
    appEnvironment: command.appEnvironment,
    correlationId: command.correlationId,
    manufacturerSiteName: command.manufacturerSiteName,
    pairingReferenceId: command.pairingReferenceId,
    purpose: "establish-pairing" as const,
  });
  const auditEvent = Object.freeze({
    actor: command.actor,
    correlationId: command.correlationId,
    eventId: `audit:${command.idempotencyKey}`,
    eventType: "pairing.initiated" as const,
    idempotencyKey: command.idempotencyKey,
    occurredAt: command.createdAt,
    pairingId: command.pairingId,
    protocolVersion: command.protocolVersion,
  });

  return ok({
    auditEvents: [auditEvent],
    nextState: {
      localPairings: [
        ...state.localPairings,
        {
          correlationId: command.correlationId,
          pairingId: command.pairingId,
          role: "manufacturer",
          sourceEpicLocalId: command.sourceEpicLocalId,
          status: "awaiting-supplier-acceptance",
        },
      ],
      processedIdempotencyKeys: [
        ...state.processedIdempotencyKeys,
        command.idempotencyKey,
      ],
    },
    pairingReference,
  });
}
