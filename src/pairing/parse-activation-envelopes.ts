import {
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  readIdentity,
} from "./envelope-fields";
import type {
  ActivationPollRequest,
  ActivationProposal,
  ConfirmationRequest,
} from "./site-relationship-activation";

/**
 * Parses Blue's bounded poll envelope on Green's bootstrap route. Callers must
 * verify the request signature before invoking this.
 */
export function parseActivationPollRequest(
  body: string,
): ActivationPollRequest | undefined {
  try {
    const value: unknown = JSON.parse(body);
    if (!isRecord(value)) {
      return undefined;
    }

    const {
      correlationId,
      createdAt,
      intendedReceiverSiteAri,
      operation,
      protocolVersion,
      relationshipId,
      requestId,
    } = value;
    const nominatedIdentity = readIdentity(value["nominatedIdentity"]);

    if (
      operation !== "site-relationship.poll" ||
      protocolVersion !== "v1" ||
      !nominatedIdentity ||
      !isNonEmptyString(correlationId) ||
      !isIsoTimestamp(createdAt) ||
      !isNonEmptyString(intendedReceiverSiteAri) ||
      !isNonEmptyString(relationshipId) ||
      !isNonEmptyString(requestId)
    ) {
      return undefined;
    }

    return {
      correlationId,
      createdAt,
      intendedReceiverSiteAri,
      nominatedIdentity,
      operation,
      protocolVersion,
      relationshipId,
      requestId,
    };
  } catch {
    return undefined;
  }
}

/**
 * Parses Blue's confirmation envelope on Green's bootstrap route. Callers must
 * verify the request signature before invoking this.
 */
export function parseConfirmationRequest(
  body: string,
): ConfirmationRequest | undefined {
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
      leaseEndsAt,
      operation,
      protocolVersion,
      relationshipId,
      requestId,
      termsVersion,
    } = value;
    const confirmedIdentity = readIdentity(value["confirmedIdentity"]);

    if (
      operation !== "site-relationship.confirm" ||
      protocolVersion !== "v1" ||
      !confirmedIdentity ||
      !isNonEmptyString(correlationId) ||
      !isIsoTimestamp(createdAt) ||
      !isNonEmptyString(idempotencyKey) ||
      !isNonEmptyString(intendedReceiverSiteAri) ||
      !isIsoTimestamp(leaseEndsAt) ||
      !isNonEmptyString(relationshipId) ||
      !isNonEmptyString(requestId) ||
      !isNonEmptyString(termsVersion)
    ) {
      return undefined;
    }

    return {
      confirmedIdentity,
      correlationId,
      createdAt,
      idempotencyKey,
      intendedReceiverSiteAri,
      leaseEndsAt,
      operation,
      protocolVersion,
      relationshipId,
      requestId,
      termsVersion,
    };
  } catch {
    return undefined;
  }
}

/**
 * Parses Green's activation proposal on Blue. Only the fields Blue compares
 * with its pending record are read; anything else Green sends is discarded,
 * so no peer-supplied endpoint can reach Blue's local record.
 */
export function parseActivationProposal(
  body: string,
): ActivationProposal | undefined {
  try {
    const value: unknown = JSON.parse(body);
    if (!isRecord(value)) {
      return undefined;
    }

    const {
      correlationId,
      counterpartSiteAri,
      leaseEndsAt,
      operation,
      protocolVersion,
      relationshipId,
      termsVersion,
    } = value;
    const approvedIdentity = readIdentity(value["approvedIdentity"]);

    if (
      operation !== "site-relationship.activation-proposal" ||
      protocolVersion !== "v1" ||
      !approvedIdentity ||
      !isNonEmptyString(correlationId) ||
      !isNonEmptyString(counterpartSiteAri) ||
      !isIsoTimestamp(leaseEndsAt) ||
      !isNonEmptyString(relationshipId) ||
      !isNonEmptyString(termsVersion)
    ) {
      return undefined;
    }

    return {
      approvedIdentity,
      correlationId,
      counterpartSiteAri,
      leaseEndsAt,
      operation,
      protocolVersion,
      relationshipId,
      termsVersion,
    };
  } catch {
    return undefined;
  }
}

const proposalBearingOutcomes = new Set<string>([
  "active",
  "awaiting-blue-confirmation",
]);
const pendingOutcomes = new Set<string>([
  "awaiting-green-approval",
  "invalidated",
  "rejected",
]);

/** What Blue accepts back from a bounded poll of Green's bootstrap route. */
export type ActivationPollResponse =
  | {
      readonly outcome: "active" | "awaiting-blue-confirmation";
      readonly proposal: ActivationProposal;
    }
  | {
      readonly outcome: "awaiting-green-approval" | "invalidated" | "rejected";
    };

/**
 * Parses Green's poll response on Blue. An outcome that should carry a
 * proposal is rejected outright when the proposal is missing or malformed, so
 * Blue never accepts a half-formed activation.
 */
export function parseActivationPollResponse(
  body: string,
): ActivationPollResponse | undefined {
  try {
    const value: unknown = JSON.parse(body);
    if (!isRecord(value)) {
      return undefined;
    }

    const { outcome } = value;
    if (typeof outcome !== "string") {
      return undefined;
    }

    if (pendingOutcomes.has(outcome)) {
      return {
        outcome: outcome as
          | "awaiting-green-approval"
          | "invalidated"
          | "rejected",
      };
    }

    if (!proposalBearingOutcomes.has(outcome)) {
      return undefined;
    }

    const proposal = parseActivationProposal(body);
    return proposal
      ? {
          outcome: outcome as "active" | "awaiting-blue-confirmation",
          proposal,
        }
      : undefined;
  } catch {
    return undefined;
  }
}
