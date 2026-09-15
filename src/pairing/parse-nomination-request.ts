import { V1_PEER_OPERATIONS } from "../collaboration/protocol";
import {
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  readIdentity,
} from "./envelope-fields";
import type {
  NominationRequest,
  NominationTerms,
  ReceiverEndpointStatus,
} from "./site-relationship-nomination";

const allowedOperations = new Set<string>(V1_PEER_OPERATIONS);
const endpointStatuses = new Set<string>(["configured", "not-configured"]);

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
      relationshipId,
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
      !isNonEmptyString(relationshipId) ||
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
      relationshipId,
      requestId,
      terms,
    };
  } catch {
    return undefined;
  }
}
