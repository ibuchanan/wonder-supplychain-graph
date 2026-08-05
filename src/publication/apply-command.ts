import { err, ok, type Result } from "@forge-ahead/errors";

import type { ProtocolVersion } from "../collaboration/protocol";

export interface PublicationPairing {
  readonly automationConnectionUserId: string;
  readonly pairedEpicId: string;
  readonly pairingId: string;
  readonly sourceEpicId: string;
  readonly status: "active";
}

export type SnapshotCandidateState = "cancelled" | "failed" | "queued";

export interface SnapshotCandidate {
  readonly candidateId: string;
  readonly correlationId: string;
  readonly pairedEpicId: string;
  readonly pairingId: string;
  readonly publisherId: string;
  readonly sourceEpicId: string;
  readonly state: SnapshotCandidateState;
}

/** The last successfully Published version, retained across candidate outcomes. */
export interface CurrentPublishedVersion {
  readonly publishedAt: string;
  readonly version: string;
}

export interface PublicationState {
  readonly candidates: readonly SnapshotCandidate[];
  readonly currentVersion?: CurrentPublishedVersion | undefined;
  readonly pairings: readonly PublicationPairing[];
  readonly processedIdempotencyKeys: readonly string[];
}

export interface PublicationCommand {
  readonly correlationId: string;
  readonly idempotencyKey: string;
  /** Supplied by the caller; the core never reads a clock. */
  readonly occurredAt: string;
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

/**
 * Non-content evidence of a publication state change. Carries the shared
 * correlation ID and idempotency key that join it to the peer operation, and
 * never carries Jira content.
 */
export interface PublicationAuditEvent {
  readonly candidateId: string;
  readonly correlationId: string;
  readonly eventId: string;
  readonly eventType:
    | "publication.candidate-cancelled"
    | "publication.delivery-failed"
    | "publication.preflight-failed"
    | "publication.queued";
  readonly idempotencyKey: string;
  readonly occurredAt: string;
  readonly pairingId: string;
  readonly protocolVersion: ProtocolVersion;
  /**
   * A safe outcome code. Narrowed to a fixed vocabulary on the decision types;
   * cancellation reasons are administrator-supplied text.
   */
  readonly reason?: string;
}

/**
 * Cancellation records who stopped the candidate, alongside the time, reason,
 * and correlation ID every audit event carries.
 */
export interface CandidateCancelledAuditEvent extends PublicationAuditEvent {
  readonly actor: CancellationActor;
  readonly actorId: string;
  readonly eventType: "publication.candidate-cancelled";
  readonly reason: string;
}

export type CancellationActor = "publisher" | "site-administrator";

export type DeliveryFailureReason = "retries-exhausted" | "terminal-error";

export type PreflightFailureReason =
  | "automation-user-not-authorized"
  | "invalid-publication-pairing"
  | "invalid-snapshot-schema"
  | "publishing-authority-denied"
  | "source-epic-access-denied";

export type PublicationDecision =
  | {
      readonly candidateId: string;
      readonly idempotency: "applied" | "replayed";
      readonly state: "queued";
    }
  | {
      readonly candidateId: string;
      readonly reason: PreflightFailureReason;
      readonly state: "preflight-failed";
    };

export interface PublicationCommandResult {
  readonly auditEvents: readonly PublicationAuditEvent[];
  readonly decision: PublicationDecision;
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

export interface CandidateNotFoundError {
  readonly candidateId: string;
  readonly code: "candidate-not-found";
  readonly pairingId: string;
}

export interface DeliveryFailureCommand {
  readonly candidateId: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly occurredAt: string;
  readonly operation: "snapshot.candidate.fail";
  readonly pairingId: string;
  readonly protocolVersion: ProtocolVersion;
  readonly reason: DeliveryFailureReason;
}

export interface DeliveryFailureResult {
  readonly auditEvents: readonly PublicationAuditEvent[];
  readonly decision: {
    readonly candidateId: string;
    readonly reason: DeliveryFailureReason;
    readonly state: "failed";
  };
  readonly nextState: PublicationState;
}

/**
 * A failed preflight queues nothing and leaves state untouched, so a corrected
 * retry re-runs preflight rather than replaying the failure.
 */
function preflightFailure(
  state: PublicationState,
  command: PublicationCommand,
  candidateId: string,
  reason: PreflightFailureReason,
): PublicationCommandResult {
  return {
    auditEvents: [
      Object.freeze({
        candidateId,
        correlationId: command.correlationId,
        eventId: `audit:${command.idempotencyKey}`,
        eventType: "publication.preflight-failed" as const,
        idempotencyKey: command.idempotencyKey,
        occurredAt: command.occurredAt,
        pairingId: command.pairingId,
        protocolVersion: command.protocolVersion,
        reason,
      }),
    ],
    decision: { candidateId, reason, state: "preflight-failed" },
    deliveryRequests: [],
    nextState: state,
  };
}

export function applyPublicationCommand(
  state: PublicationState,
  command: PublicationCommand,
): Result<PublicationCommandResult, PublicationCommandError> {
  const candidateId = `candidate:${command.idempotencyKey}`;

  if (state.processedIdempotencyKeys.includes(command.idempotencyKey)) {
    return ok({
      auditEvents: [],
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
    return ok(
      preflightFailure(
        state,
        command,
        candidateId,
        "invalid-publication-pairing",
      ),
    );
  }

  if (pairing.automationConnectionUserId !== command.publisherId) {
    return ok(
      preflightFailure(
        state,
        command,
        candidateId,
        "automation-user-not-authorized",
      ),
    );
  }

  if (command.preflight.sourceAccess !== "granted") {
    return ok(
      preflightFailure(
        state,
        command,
        candidateId,
        "source-epic-access-denied",
      ),
    );
  }

  if (command.preflight.publishingAuthority !== "granted") {
    return ok(
      preflightFailure(
        state,
        command,
        candidateId,
        "publishing-authority-denied",
      ),
    );
  }

  if (command.preflight.schema !== "valid") {
    return ok(
      preflightFailure(state, command, candidateId, "invalid-snapshot-schema"),
    );
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

  const auditEvent: PublicationAuditEvent = Object.freeze({
    candidateId,
    correlationId: command.correlationId,
    eventId: `audit:${command.idempotencyKey}`,
    eventType: "publication.queued",
    idempotencyKey: command.idempotencyKey,
    occurredAt: command.occurredAt,
    pairingId: command.pairingId,
    protocolVersion: command.protocolVersion,
  });

  return ok({
    auditEvents: [auditEvent],
    decision: {
      candidateId,
      idempotency: "applied",
      state: "queued",
    },
    deliveryRequests: [deliveryRequest],
    nextState: {
      candidates: [...state.candidates, candidate],
      // Queuing a newer candidate never displaces the current version.
      currentVersion: state.currentVersion,
      pairings: state.pairings,
      processedIdempotencyKeys: [
        ...state.processedIdempotencyKeys,
        command.idempotencyKey,
      ],
    },
  });
}

/**
 * Ends a candidate terminally after bounded retries or a terminal error. The
 * prior Published version stays current, so a failure never removes it.
 */
export function applyDeliveryFailureCommand(
  state: PublicationState,
  command: DeliveryFailureCommand,
): Result<DeliveryFailureResult, CandidateNotFoundError> {
  const candidate = state.candidates.find(
    (entry) =>
      entry.candidateId === command.candidateId &&
      entry.pairingId === command.pairingId,
  );

  if (!candidate) {
    return err({
      candidateId: command.candidateId,
      code: "candidate-not-found",
      pairingId: command.pairingId,
    });
  }

  const auditEvent: PublicationAuditEvent = Object.freeze({
    candidateId: command.candidateId,
    correlationId: command.correlationId,
    eventId: `audit:${command.idempotencyKey}`,
    eventType: "publication.delivery-failed",
    idempotencyKey: command.idempotencyKey,
    occurredAt: command.occurredAt,
    pairingId: command.pairingId,
    protocolVersion: command.protocolVersion,
    reason: command.reason,
  });

  return ok({
    auditEvents: [auditEvent],
    decision: {
      candidateId: command.candidateId,
      reason: command.reason,
      state: "failed",
    },
    nextState: {
      candidates: state.candidates.map((entry) =>
        entry.candidateId === candidate.candidateId
          ? { ...entry, state: "failed" as const }
          : entry,
      ),
      currentVersion: state.currentVersion,
      pairings: state.pairings,
      processedIdempotencyKeys: [
        ...state.processedIdempotencyKeys,
        command.idempotencyKey,
      ],
    },
  });
}

export interface PublicationCancellationCommand {
  readonly actor: CancellationActor;
  readonly actorId: string;
  readonly candidateId: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly occurredAt: string;
  readonly operation: "candidate.cancel";
  readonly pairingId: string;
  readonly protocolVersion: ProtocolVersion;
  readonly reason: string;
}

export interface PublicationCancellationResult {
  readonly auditEvents: readonly CandidateCancelledAuditEvent[];
  readonly decision: {
    readonly candidateId: string;
    readonly state: "cancelled";
  };
  readonly nextState: PublicationState;
}

/**
 * Cancellation is candidate-only: it stops the candidate and leaves the last
 * Published version accessible.
 */
export function applyPublicationCancellationCommand(
  state: PublicationState,
  command: PublicationCancellationCommand,
): Result<PublicationCancellationResult, CandidateNotFoundError> {
  const candidate = state.candidates.find(
    (entry) =>
      entry.candidateId === command.candidateId &&
      entry.pairingId === command.pairingId,
  );

  if (!candidate) {
    return err({
      candidateId: command.candidateId,
      code: "candidate-not-found",
      pairingId: command.pairingId,
    });
  }

  const auditEvent: CandidateCancelledAuditEvent = Object.freeze({
    actor: command.actor,
    actorId: command.actorId,
    candidateId: command.candidateId,
    correlationId: command.correlationId,
    eventId: `audit:${command.idempotencyKey}`,
    eventType: "publication.candidate-cancelled",
    idempotencyKey: command.idempotencyKey,
    occurredAt: command.occurredAt,
    pairingId: command.pairingId,
    protocolVersion: command.protocolVersion,
    reason: command.reason,
  });

  return ok({
    auditEvents: [auditEvent],
    decision: { candidateId: command.candidateId, state: "cancelled" },
    nextState: {
      candidates: state.candidates.map((entry) =>
        entry.candidateId === candidate.candidateId
          ? { ...entry, state: "cancelled" as const }
          : entry,
      ),
      currentVersion: state.currentVersion,
      pairings: state.pairings,
      processedIdempotencyKeys: [
        ...state.processedIdempotencyKeys,
        command.idempotencyKey,
      ],
    },
  });
}
