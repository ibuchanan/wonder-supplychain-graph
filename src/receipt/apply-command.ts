import { err, ok, type Result } from "@forge-ahead/errors";

import type { ProtocolVersion } from "../collaboration/protocol";

export interface SnapshotIssue {
  readonly description: string;
  readonly issueType: string;
  readonly key: string;
  readonly priority: string;
  readonly statusCategory: string;
  readonly summary: string;
}

export interface SnapshotContent {
  readonly children: readonly SnapshotIssue[];
  readonly epic: SnapshotIssue;
}

export interface CurrentPackage {
  readonly content: SnapshotContent;
  readonly correlationId: string;
  readonly pairedEpicId: string;
  readonly pairingId: string;
  readonly publishedAt: string;
  readonly publisherId: string;
  readonly sourceEpicId: string;
  readonly sourceSiteId: string;
  readonly version: string;
}

export interface SupplierPairing {
  readonly expectedPeerInstallationId: string;
  readonly pairedEpicId: string;
  readonly pairingId: string;
  readonly sourceEpicId: string;
  readonly status: "active";
}

export interface SupplierReceiptState {
  readonly currentPackage: CurrentPackage | undefined;
  readonly pairings: readonly SupplierPairing[];
  readonly processedIdempotencyKeys: readonly string[];
}

export interface SupplierReceiptCommand {
  readonly authorization: "granted" | "denied";
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly operation: "snapshot.candidate.receive";
  readonly peerInstallationId: string;
  readonly protocolVersion: ProtocolVersion;
  readonly snapshot: Omit<CurrentPackage, "correlationId">;
}

export interface SupplierCandidateCancellationCommand {
  readonly authorization: "granted" | "denied";
  readonly candidateId: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly operation: "candidate.cancel";
  readonly pairedEpicId: string;
  readonly pairingId: string;
  readonly peerInstallationId: string;
  readonly protocolVersion: ProtocolVersion;
  readonly sourceEpicId: string;
}

export interface SupplierReceiptAuditEvent {
  readonly correlationId: string;
  readonly eventId: string;
  readonly eventType: "snapshot.received-and-promoted";
  readonly idempotencyKey: string;
  readonly occurredAt: string;
  readonly pairingId: string;
  readonly protocolVersion: ProtocolVersion;
}

export interface PeerAuthorizationDeniedError {
  readonly code: "peer-authorization-denied";
  readonly peerInstallationId: string;
}

export interface InvalidSnapshotSchemaError {
  readonly code: "invalid-snapshot-schema";
  readonly pairingId: string;
  readonly sourceEpicId: string;
}

export interface InvalidCorrelationIdError {
  readonly code: "invalid-correlation-id";
}

export interface InvalidIdempotencyKeyError {
  readonly code: "invalid-idempotency-key";
}

export interface UnsupportedProtocolVersionError {
  readonly code: "unsupported-protocol-version";
  readonly protocolVersion: string;
}

export interface ActivePairingNotFoundError {
  readonly code: "active-pairing-not-found";
  readonly pairedEpicId: string;
  readonly pairingId: string;
  readonly sourceEpicId: string;
}

export interface UnexpectedPeerInstallationError {
  readonly code: "unexpected-peer-installation";
  readonly pairingId: string;
  readonly peerInstallationId: string;
}

export type SupplierReceiptError =
  | ActivePairingNotFoundError
  | InvalidCorrelationIdError
  | InvalidIdempotencyKeyError
  | InvalidSnapshotSchemaError
  | PeerAuthorizationDeniedError
  | UnexpectedPeerInstallationError
  | UnsupportedProtocolVersionError;

export interface CandidateCancelledAuditEvent {
  readonly candidateId: string;
  readonly correlationId: string;
  readonly eventId: string;
  readonly eventType: "snapshot.candidate.cancelled";
  readonly idempotencyKey: string;
  readonly pairingId: string;
  readonly protocolVersion: ProtocolVersion;
}

export interface SupplierCancellationResult {
  readonly auditEvents: readonly CandidateCancelledAuditEvent[];
  readonly decision: {
    readonly idempotency: "applied";
    readonly state: "cancelled";
  };
  readonly nextState: SupplierReceiptState;
}

export interface SupplierReceiptResult {
  readonly auditEvents: readonly SupplierReceiptAuditEvent[];
  readonly decision: {
    readonly idempotency: "applied" | "replayed";
    readonly state: "published";
    readonly version: string;
  };
  readonly nextState: SupplierReceiptState;
}

function hasExactKeys(value: object, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();

  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  );
}

function isSnapshotIssue(value: unknown): value is SnapshotIssue {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const issue = value as Record<string, unknown>;

  return (
    hasExactKeys(issue, [
      "description",
      "issueType",
      "key",
      "priority",
      "statusCategory",
      "summary",
    ]) &&
    Object.values(issue).every(
      (field) => typeof field === "string" && field.length > 0,
    )
  );
}

interface UntrustedSnapshot {
  readonly content: unknown;
  readonly pairedEpicId: unknown;
  readonly pairingId: unknown;
  readonly publishedAt: unknown;
  readonly publisherId: unknown;
  readonly sourceEpicId: unknown;
  readonly sourceSiteId: unknown;
  readonly version: unknown;
}

interface UntrustedSnapshotContent {
  readonly children: unknown;
  readonly epic: unknown;
}

function hasFixedSnapshotSchema(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const snapshot = value as UntrustedSnapshot;

  if (
    !hasExactKeys(snapshot, [
      "content",
      "pairedEpicId",
      "pairingId",
      "publishedAt",
      "publisherId",
      "sourceEpicId",
      "sourceSiteId",
      "version",
    ]) ||
    typeof snapshot.content !== "object" ||
    snapshot.content === null
  ) {
    return false;
  }

  const content = snapshot.content as UntrustedSnapshotContent;

  return (
    hasExactKeys(content, ["children", "epic"]) &&
    isSnapshotIssue(content.epic) &&
    Array.isArray(content.children) &&
    content.children.every(isSnapshotIssue) &&
    [
      snapshot.pairedEpicId,
      snapshot.pairingId,
      snapshot.publishedAt,
      snapshot.publisherId,
      snapshot.sourceEpicId,
      snapshot.sourceSiteId,
      snapshot.version,
    ].every((field) => typeof field === "string" && field.length > 0)
  );
}

export function applySupplierReceiptCommand(
  state: SupplierReceiptState,
  command: SupplierReceiptCommand,
): Result<SupplierReceiptResult, SupplierReceiptError> {
  if (command.correlationId.trim().length === 0) {
    return err({ code: "invalid-correlation-id" });
  }

  if (command.idempotencyKey.trim().length === 0) {
    return err({ code: "invalid-idempotency-key" });
  }

  if (command.protocolVersion !== "v1") {
    return err({
      code: "unsupported-protocol-version",
      protocolVersion: command.protocolVersion,
    });
  }

  if (command.authorization !== "granted") {
    return err({
      code: "peer-authorization-denied",
      peerInstallationId: command.peerInstallationId,
    });
  }

  if (!hasFixedSnapshotSchema(command.snapshot)) {
    return err({
      code: "invalid-snapshot-schema",
      pairingId: command.snapshot.pairingId,
      sourceEpicId: command.snapshot.sourceEpicId,
    });
  }

  const pairing = state.pairings.find(
    (candidate) =>
      candidate.pairingId === command.snapshot.pairingId &&
      candidate.sourceEpicId === command.snapshot.sourceEpicId &&
      candidate.pairedEpicId === command.snapshot.pairedEpicId,
  );

  if (!pairing) {
    return err({
      code: "active-pairing-not-found",
      pairedEpicId: command.snapshot.pairedEpicId,
      pairingId: command.snapshot.pairingId,
      sourceEpicId: command.snapshot.sourceEpicId,
    });
  }

  if (pairing.expectedPeerInstallationId !== command.peerInstallationId) {
    return err({
      code: "unexpected-peer-installation",
      pairingId: pairing.pairingId,
      peerInstallationId: command.peerInstallationId,
    });
  }

  if (state.processedIdempotencyKeys.includes(command.idempotencyKey)) {
    return ok({
      auditEvents: [],
      decision: {
        idempotency: "replayed",
        state: "published",
        version: state.currentPackage?.version ?? command.snapshot.version,
      },
      nextState: state,
    });
  }

  const currentPackage: CurrentPackage = {
    ...command.snapshot,
    correlationId: command.correlationId,
  };
  const auditEvent: SupplierReceiptAuditEvent = Object.freeze({
    correlationId: command.correlationId,
    eventId: `audit:${command.idempotencyKey}`,
    eventType: "snapshot.received-and-promoted",
    idempotencyKey: command.idempotencyKey,
    occurredAt: command.snapshot.publishedAt,
    pairingId: command.snapshot.pairingId,
    protocolVersion: command.protocolVersion,
  });

  return ok({
    auditEvents: [auditEvent],
    decision: {
      idempotency: "applied",
      state: "published",
      version: currentPackage.version,
    },
    nextState: {
      currentPackage,
      pairings: state.pairings,
      processedIdempotencyKeys: [
        ...state.processedIdempotencyKeys,
        command.idempotencyKey,
      ],
    },
  });
}

export function applySupplierCandidateCancellationCommand(
  state: SupplierReceiptState,
  command: SupplierCandidateCancellationCommand,
): Result<SupplierCancellationResult, SupplierReceiptError> {
  if (command.authorization !== "granted") {
    return err({
      code: "peer-authorization-denied",
      peerInstallationId: command.peerInstallationId,
    });
  }

  const pairing = state.pairings.find(
    (candidate) =>
      candidate.pairingId === command.pairingId &&
      candidate.sourceEpicId === command.sourceEpicId &&
      candidate.pairedEpicId === command.pairedEpicId,
  );

  if (!pairing) {
    return err({
      code: "active-pairing-not-found",
      pairedEpicId: command.pairedEpicId,
      pairingId: command.pairingId,
      sourceEpicId: command.sourceEpicId,
    });
  }

  if (pairing.expectedPeerInstallationId !== command.peerInstallationId) {
    return err({
      code: "unexpected-peer-installation",
      pairingId: pairing.pairingId,
      peerInstallationId: command.peerInstallationId,
    });
  }

  const auditEvent: CandidateCancelledAuditEvent = Object.freeze({
    candidateId: command.candidateId,
    correlationId: command.correlationId,
    eventId: `audit:${command.idempotencyKey}`,
    eventType: "snapshot.candidate.cancelled",
    idempotencyKey: command.idempotencyKey,
    pairingId: command.pairingId,
    protocolVersion: command.protocolVersion,
  });

  return ok({
    auditEvents: [auditEvent],
    decision: {
      idempotency: "applied",
      state: "cancelled",
    },
    nextState: {
      currentPackage: state.currentPackage,
      pairings: state.pairings,
      processedIdempotencyKeys: [
        ...state.processedIdempotencyKeys,
        command.idempotencyKey,
      ],
    },
  });
}
