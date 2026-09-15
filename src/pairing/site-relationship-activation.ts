import { err, ok, type Result } from "@forge-ahead/errors";

import type {
  ProtocolVersion,
  SetupDirection,
} from "../collaboration/protocol";
import type { SiteRelationship } from "./site-relationship";
import {
  identitiesMatch,
  type NominatedIdentity,
  type SiteRelationshipSetupState,
} from "./site-relationship-nomination";

/**
 * Blue's bounded protected poll. It carries no secret and no endpoint: Green
 * answers it from its own approved state, and Blue keeps no session open
 * between polls.
 */
export interface ActivationPollRequest {
  readonly correlationId: string;
  readonly createdAt: string;
  readonly direction: SetupDirection;
  readonly intendedReceiverSiteAri: string;
  readonly nominatedIdentity: NominatedIdentity;
  readonly operation: "site-relationship.poll";
  readonly protocolVersion: ProtocolVersion;
  readonly relationshipId: string;
  readonly requestId: string;
  readonly termsVersion: string;
}

/**
 * Green's answer to an approved poll. It names the Blue identity Green
 * actually approved and Green's own site as Blue's counterpart, so Blue can
 * compare every field with its pending record. It carries no endpoint URL.
 */
export interface ActivationProposal {
  readonly approvedIdentity: NominatedIdentity;
  readonly correlationId: string;
  readonly counterpartSiteAri: string;
  readonly direction: SetupDirection;
  readonly leaseEndsAt: string;
  readonly operation: "site-relationship.activation-proposal";
  readonly protocolVersion: ProtocolVersion;
  readonly relationshipId: string;
  readonly termsVersion: string;
}

export type ActivationPollOutcome =
  | {
      readonly outcome: "active" | "awaiting-blue-confirmation";
      readonly proposal: ActivationProposal;
    }
  | {
      readonly outcome: "awaiting-green-approval" | "invalidated" | "rejected";
    };

/** Every denied poll path. Reason codes are safe to record and return. */
export type ProposeActivationError = {
  readonly code:
    | "activation-receiver-mismatch"
    | "lease-expired"
    | "nomination-identity-mismatch"
    | "nomination-not-found"
    | "nomination-terms-mismatch"
    | "relationship-id-mismatch";
};

export interface ActivationPollContext {
  readonly localIdentity: NominatedIdentity;
  readonly now: string;
}

/**
 * Answers one authenticated poll on Green. The caller must already have
 * verified the request signature.
 */
export function proposeSiteRelationshipActivation(
  state: SiteRelationshipSetupState,
  request: ActivationPollRequest,
  context: ActivationPollContext,
): Result<ActivationPollOutcome, ProposeActivationError> {
  if (request.intendedReceiverSiteAri !== context.localIdentity.siteAri) {
    return err({ code: "activation-receiver-mismatch" });
  }

  const nomination = state.nominations.find(
    (candidate) =>
      candidate.role === "green" &&
      candidate.correlationId === request.correlationId,
  );
  if (!nomination) {
    return err({ code: "nomination-not-found" });
  }

  if (nomination.relationshipId !== request.relationshipId) {
    return err({ code: "relationship-id-mismatch" });
  }

  // The polling site's claimed identity is peer-supplied; it grants nothing
  // unless it is exactly the identity Green has on record.
  if (
    !identitiesMatch(request.nominatedIdentity, nomination.nominatedIdentity)
  ) {
    return err({ code: "nomination-identity-mismatch" });
  }

  // Terms are immutable: a poll that names a different version is asking
  // about consent Green never gave.
  if (request.termsVersion !== nomination.terms.termsVersion) {
    return err({ code: "nomination-terms-mismatch" });
  }

  if (
    nomination.status !== "awaiting-blue-confirmation" &&
    nomination.status !== "active"
  ) {
    return ok({ outcome: nomination.status });
  }

  // The fixed agreement end instant runs regardless of how Blue polls.
  if (context.now >= nomination.terms.expiresAt) {
    return err({ code: "lease-expired" });
  }

  // An active Green record keeps answering with the same proposal so Blue can
  // still complete its own activation after a lost confirmation response.
  return ok({
    outcome: nomination.status,
    proposal: Object.freeze({
      approvedIdentity: nomination.nominatedIdentity,
      correlationId: nomination.correlationId,
      counterpartSiteAri: context.localIdentity.siteAri,
      direction: "green-to-blue" as const,
      leaseEndsAt: nomination.terms.expiresAt,
      operation: "site-relationship.activation-proposal" as const,
      protocolVersion: "v1" as const,
      relationshipId: nomination.relationshipId,
      termsVersion: nomination.terms.termsVersion,
    }),
  });
}

/**
 * The confirmation Blue signs once it has accepted the proposal locally. Its
 * request ID and created-at instant are always fresh: the confirmation is a
 * new decision, never a replay of the nomination.
 */
export interface ConfirmationRequest {
  readonly confirmedIdentity: NominatedIdentity;
  readonly correlationId: string;
  readonly createdAt: string;
  readonly direction: SetupDirection;
  readonly idempotencyKey: string;
  readonly intendedReceiverSiteAri: string;
  readonly leaseEndsAt: string;
  readonly operation: "site-relationship.confirm";
  readonly protocolVersion: ProtocolVersion;
  readonly relationshipId: string;
  readonly requestId: string;
  readonly termsVersion: string;
}

/** Every refused acceptance path on Blue. */
export type AcceptActivationError = {
  readonly code:
    | "activation-proposal-mismatch"
    | "lease-expired"
    | "pending-nomination-not-found";
};

export interface ActivationAcceptanceResult {
  readonly confirmation: ConfirmationRequest;
  readonly nextState: SiteRelationshipSetupState;
}

export interface ActivationAcceptanceContext {
  readonly idempotencyKey: string;
  readonly localIdentity: NominatedIdentity;
  readonly now: string;
  readonly requestId: string;
}

/**
 * Applies one activation proposal on Blue. Nothing is recorded until the
 * proposal matches Blue's own pending record field for field.
 */
export function acceptActivationProposal(
  state: SiteRelationshipSetupState,
  proposal: ActivationProposal,
  context: ActivationAcceptanceContext,
): Result<ActivationAcceptanceResult, AcceptActivationError> {
  const nomination = state.nominations.find(
    (candidate) =>
      candidate.role === "blue" &&
      candidate.correlationId === proposal.correlationId,
  );
  if (!nomination) {
    return err({ code: "pending-nomination-not-found" });
  }

  // Blue grants nothing on Green's word: the proposal must repeat the
  // relationship, counterpart, identity, and immutable terms it nominated.
  if (
    proposal.relationshipId !== nomination.relationshipId ||
    proposal.counterpartSiteAri !== nomination.counterpartSiteAri ||
    !identitiesMatch(proposal.approvedIdentity, nomination.nominatedIdentity) ||
    proposal.termsVersion !== nomination.terms.termsVersion ||
    proposal.leaseEndsAt !== nomination.terms.expiresAt
  ) {
    return err({ code: "activation-proposal-mismatch" });
  }

  if (context.now >= nomination.terms.expiresAt) {
    return err({ code: "lease-expired" });
  }

  // A retry after a lost response must not move the recorded acceptance; only
  // the request ID and timestamp are fresh each time.
  const accepted = nomination.acceptedAt
    ? nomination
    : {
        ...nomination,
        acceptedAt: context.now,
        status: "awaiting-blue-confirmation" as const,
      };

  return ok({
    confirmation: Object.freeze({
      confirmedIdentity: context.localIdentity,
      correlationId: nomination.correlationId,
      createdAt: context.now,
      direction: "blue-to-green" as const,
      idempotencyKey: context.idempotencyKey,
      intendedReceiverSiteAri: nomination.counterpartSiteAri,
      leaseEndsAt: nomination.terms.expiresAt,
      operation: "site-relationship.confirm" as const,
      protocolVersion: "v1" as const,
      relationshipId: nomination.relationshipId,
      requestId: context.requestId,
      termsVersion: nomination.terms.termsVersion,
    }),
    nextState: {
      ...state,
      nominations: state.nominations.map((candidate) =>
        candidate === nomination ? accepted : candidate,
      ),
    },
  });
}

export interface ConfirmationReceipt {
  readonly correlationId: string;
  readonly outcome: "active";
  readonly relationshipId: string;
}

export interface ConfirmationResult {
  readonly nextState: SiteRelationshipSetupState;
  readonly receipt: ConfirmationReceipt;
}

export interface ConfirmationContext {
  readonly localIdentity: NominatedIdentity;
  readonly now: string;
}

/** Every denied confirmation path on Green. */
export type ReceiveConfirmationError = {
  readonly code:
    | "activation-receiver-mismatch"
    | "approval-not-recorded"
    | "confirmation-mismatch"
    | "lease-expired"
    | "pending-nomination-not-found";
};

/**
 * Applies one authenticated confirmation on Green, activating its local Site
 * relationship. The caller must already have verified the request signature.
 */
export function receiveSiteRelationshipConfirmation(
  state: SiteRelationshipSetupState,
  request: ConfirmationRequest,
  context: ConfirmationContext,
): Result<ConfirmationResult, ReceiveConfirmationError> {
  if (request.intendedReceiverSiteAri !== context.localIdentity.siteAri) {
    return err({ code: "activation-receiver-mismatch" });
  }

  const nomination = state.nominations.find(
    (candidate) =>
      candidate.role === "green" &&
      candidate.correlationId === request.correlationId,
  );
  if (!nomination) {
    return err({ code: "pending-nomination-not-found" });
  }

  // Green activates only what its own administrator approved, field for field.
  if (
    request.relationshipId !== nomination.relationshipId ||
    !identitiesMatch(request.confirmedIdentity, nomination.nominatedIdentity) ||
    request.termsVersion !== nomination.terms.termsVersion ||
    request.leaseEndsAt !== nomination.terms.expiresAt
  ) {
    return err({ code: "confirmation-mismatch" });
  }

  // A confirmation that arrives without a recorded approval activates nothing.
  if (
    nomination.status !== "awaiting-blue-confirmation" &&
    nomination.status !== "active"
  ) {
    return err({ code: "approval-not-recorded" });
  }

  if (context.now >= nomination.terms.expiresAt) {
    return err({ code: "lease-expired" });
  }

  // A duplicate delivery returns the already-recorded activation unchanged.
  if (nomination.status === "active") {
    return ok({
      nextState: state,
      receipt: {
        correlationId: nomination.correlationId,
        outcome: "active" as const,
        relationshipId: nomination.relationshipId,
      },
    });
  }

  const activated = {
    ...nomination,
    confirmedAt: context.now,
    status: "active" as const,
  };
  const relationship: SiteRelationship = {
    counterpartSiteAri: nomination.counterpartSiteAri,
    leaseEndsAt: nomination.terms.expiresAt,
    relationshipId: nomination.relationshipId,
    status: "active" as const,
    termsVersion: nomination.terms.termsVersion,
  };

  return ok({
    nextState: {
      nominations: state.nominations.map((candidate) =>
        candidate === nomination ? activated : candidate,
      ),
      processedIdempotencyKeys: [
        ...state.processedIdempotencyKeys,
        request.idempotencyKey,
      ],
      relationships: [...state.relationships, relationship],
    },
    receipt: {
      correlationId: nomination.correlationId,
      outcome: "active" as const,
      relationshipId: nomination.relationshipId,
    },
  });
}

export interface BlueActivationResult {
  readonly nextState: SiteRelationshipSetupState;
  readonly relationship: SiteRelationship;
}

/** Every refused local activation path on Blue. */
export type ActivateAfterConfirmationError = {
  readonly code:
    | "acceptance-not-recorded"
    | "confirmation-mismatch"
    | "pending-nomination-not-found";
};

/**
 * Activates Blue's local record after Green's authenticated success receipt.
 * Blue never activates on its own acceptance alone.
 */
export function activateAfterConfirmation(
  state: SiteRelationshipSetupState,
  receipt: ConfirmationReceipt,
  context: { readonly now: string },
): Result<BlueActivationResult, ActivateAfterConfirmationError> {
  const nomination = state.nominations.find(
    (candidate) =>
      candidate.role === "blue" &&
      candidate.correlationId === receipt.correlationId,
  );
  if (!nomination) {
    return err({ code: "pending-nomination-not-found" });
  }

  if (receipt.relationshipId !== nomination.relationshipId) {
    return err({ code: "confirmation-mismatch" });
  }

  // Green's success alone is not enough: Blue activates only what it accepted.
  if (!nomination.acceptedAt) {
    return err({ code: "acceptance-not-recorded" });
  }

  const recorded = state.relationships.find(
    (candidate) => candidate.relationshipId === nomination.relationshipId,
  );
  if (recorded) {
    return ok({ nextState: state, relationship: recorded });
  }

  const activated = {
    ...nomination,
    confirmedAt: context.now,
    status: "active" as const,
  };
  const relationship: SiteRelationship = {
    counterpartSiteAri: nomination.counterpartSiteAri,
    leaseEndsAt: nomination.terms.expiresAt,
    relationshipId: nomination.relationshipId,
    status: "active" as const,
    termsVersion: nomination.terms.termsVersion,
  };

  return ok({
    nextState: {
      ...state,
      nominations: state.nominations.map((candidate) =>
        candidate === nomination ? activated : candidate,
      ),
      relationships: [...state.relationships, relationship],
    },
    relationship,
  });
}
