import {
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  readIdentity,
} from "../pairing/envelope-fields";
import type { NominatedIdentity } from "../pairing/site-relationship-nomination";
import { type LeanEvent, parseLeanEvent } from "./lean-event-contract";
import { type PeerOperation, V1_PEER_OPERATIONS } from "./protocol";

/**
 * The versioned envelope every enabled operational request is signed over.
 * The HMAC makes the body authentic and tamper-evident; this envelope is what
 * makes it *checkable*, by naming the relationship, Pairing, operation, and
 * one-time request ID the receiver compares against its own state.
 *
 * It carries no secret, no endpoint URL, and no Jira content beyond the lean
 * event's identifiers.
 */
export interface PeerOperationEnvelope {
  readonly createdAt: string;
  readonly direction: PeerDirection;
  readonly event: LeanEvent;
  /** Stable across retries: business identity, not request identity. */
  readonly idempotencyKey: string;
  readonly intendedReceiverSiteAri: string;
  readonly operation: PeerOperation;
  readonly pairingId: string;
  readonly protocolVersion: "v1";
  readonly relationshipId: string;
  /** Unpredictable and single-use: fresh on every retry. */
  readonly requestId: string;
  readonly senderIdentity: NominatedIdentity;
  readonly termsVersion: string;
}

export type PeerDirection = "destination-to-source" | "source-to-destination";

/**
 * One outbound operation. `requestId` and `createdAt` belong to a single
 * delivery attempt and must be fresh every time; everything else identifies
 * the business operation and stays identical across retries.
 */
export interface PeerOperationRequest {
  readonly createdAt: string;
  readonly event: LeanEvent;
  readonly idempotencyKey: string;
  readonly intendedReceiverSiteAri: string;
  readonly operation: PeerOperation;
  readonly pairingId: string;
  readonly relationshipId: string;
  readonly requestId: string;
  readonly senderIdentity: NominatedIdentity;
  readonly termsVersion: string;
}

/** Builds the exact body the sender signs and the receiver re-verifies. */
export function buildPeerOperationEnvelope(
  request: PeerOperationRequest,
): PeerOperationEnvelope {
  return Object.freeze({
    createdAt: request.createdAt,
    direction: "source-to-destination" as const,
    event: request.event,
    idempotencyKey: request.idempotencyKey,
    intendedReceiverSiteAri: request.intendedReceiverSiteAri,
    operation: request.operation,
    pairingId: request.pairingId,
    protocolVersion: "v1" as const,
    relationshipId: request.relationshipId,
    requestId: request.requestId,
    senderIdentity: request.senderIdentity,
    termsVersion: request.termsVersion,
  });
}

const directions = new Set<string>([
  "destination-to-source",
  "source-to-destination",
]);
const operations = new Set<string>(V1_PEER_OPERATIONS);

/**
 * Parses one operational envelope. Parsing is strict and bounded: the body is
 * either exactly this versioned shape or it is nothing. Callers must have
 * verified the request signature first, and schema validity is never evidence
 * of authenticity or authority.
 */
export function parsePeerOperationEnvelope(
  body: string,
): PeerOperationEnvelope | undefined {
  try {
    const value: unknown = JSON.parse(body);
    if (!isRecord(value)) {
      return undefined;
    }

    const {
      createdAt,
      direction,
      idempotencyKey,
      intendedReceiverSiteAri,
      operation,
      pairingId,
      protocolVersion,
      relationshipId,
      requestId,
      termsVersion,
    } = value;
    const senderIdentity = readIdentity(value["senderIdentity"]);
    const event =
      typeof value["event"] === "object" && value["event"] !== null
        ? parseLeanEvent(JSON.stringify(value["event"]))
        : undefined;

    if (
      protocolVersion !== "v1" ||
      typeof direction !== "string" ||
      !directions.has(direction) ||
      typeof operation !== "string" ||
      !operations.has(operation) ||
      !senderIdentity ||
      !event ||
      !isIsoTimestamp(createdAt) ||
      !isNonEmptyString(idempotencyKey) ||
      !isNonEmptyString(intendedReceiverSiteAri) ||
      !isNonEmptyString(pairingId) ||
      !isNonEmptyString(relationshipId) ||
      !isNonEmptyString(requestId) ||
      !isNonEmptyString(termsVersion) ||
      // The route authorizes one Pairing. An event naming another would
      // otherwise be applied under authority that was never granted to it.
      event.data.pairingId !== pairingId
    ) {
      return undefined;
    }

    return {
      createdAt,
      direction: direction as PeerDirection,
      event,
      idempotencyKey,
      intendedReceiverSiteAri,
      operation: operation as PeerOperation,
      pairingId,
      protocolVersion,
      relationshipId,
      requestId,
      senderIdentity,
      termsVersion,
    };
  } catch {
    return undefined;
  }
}
