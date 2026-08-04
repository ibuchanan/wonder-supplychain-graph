import type { ProtocolVersion } from "./protocol";

export type InvitationStatus = "pending" | "accepted";

export interface Invitation {
  readonly correlationId: string;
  readonly invitationId: string;
  readonly pairingId: string;
  readonly status: InvitationStatus;
}

export interface CollaborationState {
  readonly invitations: readonly Invitation[];
  readonly processedIdempotencyKeys: readonly string[];
}

export interface InvitationAcceptanceCommand {
  readonly acceptedAt: string;
  readonly actor: "supplier-administrator";
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly invitationId: string;
  readonly operation: "invitation.accept";
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

export function applyCollaborationCommand(
  state: CollaborationState,
  command: InvitationAcceptanceCommand,
): CollaborationCommandResult {
  if (state.processedIdempotencyKeys.includes(command.idempotencyKey)) {
    return {
      auditEvents: [],
      decision: {
        idempotency: "replayed",
        pairingId: command.pairingId,
        status: "active",
      },
      nextState: state,
    };
  }

  const invitation = state.invitations.find(
    (candidate) =>
      candidate.invitationId === command.invitationId &&
      candidate.pairingId === command.pairingId &&
      candidate.correlationId === command.correlationId,
  );

  if (invitation?.status !== "pending") {
    throw new Error("A pending invitation matching this command is required");
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

  return {
    auditEvents: [auditEvent],
    decision: {
      idempotency: "applied",
      pairingId: command.pairingId,
      status: "active",
    },
    nextState: {
      invitations: state.invitations.map((candidate) =>
        candidate.invitationId === invitation.invitationId
          ? { ...candidate, status: "accepted" }
          : candidate,
      ),
      processedIdempotencyKeys: [
        ...state.processedIdempotencyKeys,
        command.idempotencyKey,
      ],
    },
  };
}
