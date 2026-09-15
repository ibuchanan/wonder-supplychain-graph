import { V1_PEER_OPERATIONS } from "../collaboration/protocol";
import type {
  NominatedIdentity,
  NominationRequest,
  NominationTerms,
  ReceiverEndpointStatus,
} from "./site-relationship-nomination";

const allowedOperations = new Set<string>(V1_PEER_OPERATIONS);
const endpointStatuses = new Set<string>(["configured", "not-configured"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function readIdentity(value: unknown): NominatedIdentity | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { environmentAri, installationAri, siteAri } = value;
  return isNonEmptyString(environmentAri) &&
    isNonEmptyString(installationAri) &&
    isNonEmptyString(siteAri)
    ? { environmentAri, installationAri, siteAri }
    : undefined;
}

function readTerms(value: unknown): NominationTerms | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { allowedOperations: operations, expiresAt, termsVersion } = value;
  return Array.isArray(operations) &&
    operations.length > 0 &&
    operations.every(
      (operation) =>
        typeof operation === "string" && allowedOperations.has(operation),
    ) &&
    isIsoTimestamp(expiresAt) &&
    isNonEmptyString(termsVersion)
    ? {
        allowedOperations: operations as NominationTerms["allowedOperations"],
        expiresAt,
        termsVersion,
      }
    : undefined;
}

/**
 * Parses only the nomination envelope Green accepts on its bootstrap route.
 * Callers must verify the request signature before invoking this.
 */
export function parseNominationRequest(
  body: string,
): NominationRequest | undefined {
  try {
    const value: unknown = JSON.parse(body);
    if (!isRecord(value)) {
      return undefined;
    }

    const {
      correlationId,
      createdAt,
      idempotencyKey,
      intendedReceiverSiteAri,
      invitationReference,
      operation,
      protocolVersion,
      receiverEndpointStatus,
      requestId,
    } = value;
    const nominatedIdentity = readIdentity(value["nominatedIdentity"]);
    const terms = readTerms(value["terms"]);

    if (
      operation !== "site-relationship.nominate" ||
      protocolVersion !== "v1" ||
      !nominatedIdentity ||
      !terms ||
      !isNonEmptyString(correlationId) ||
      !isIsoTimestamp(createdAt) ||
      !isNonEmptyString(idempotencyKey) ||
      !isNonEmptyString(intendedReceiverSiteAri) ||
      !isNonEmptyString(invitationReference) ||
      !isNonEmptyString(requestId) ||
      typeof receiverEndpointStatus !== "string" ||
      !endpointStatuses.has(receiverEndpointStatus)
    ) {
      return undefined;
    }

    return {
      correlationId,
      createdAt,
      idempotencyKey,
      intendedReceiverSiteAri,
      invitationReference,
      nominatedIdentity,
      operation,
      protocolVersion,
      receiverEndpointStatus: receiverEndpointStatus as ReceiverEndpointStatus,
      requestId,
      terms,
    };
  } catch {
    return undefined;
  }
}
