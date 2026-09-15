import { err, ok, type Result } from "@forge-ahead/errors";

import type {
  PeerOperation,
  ProtocolVersion,
  SetupDirection,
} from "../collaboration/protocol";
import type {
  Invitation,
  InvitationWorkflowState,
} from "./invitation-workflow";
import type { SiteRelationship } from "./site-relationship";

/**
 * Site/installation/environment identity a site observes about itself and
 * proposes as the nominated counterpart. Nothing here is peer-supplied trust:
 * the receiver compares it against its own approved relationship state.
 */
export interface NominatedIdentity {
  readonly environmentAri: string;
  readonly installationAri: string;
  readonly siteAri: string;
}

/** Immutable terms carried by an invitation; any change invalidates consent. */
export interface NominationTerms {
  readonly allowedOperations: readonly PeerOperation[];
  readonly expiresAt: string;
  readonly termsVersion: string;
}

/**
 * Safe endpoint disclosure. The POC never puts an operational endpoint URL in a
 * signed body or an administrator review screen, only its configured status.
 */
export type ReceiverEndpointStatus = "configured" | "not-configured";

export type NominationStatus =
  | "active"
  | "awaiting-blue-confirmation"
  | "awaiting-green-approval"
  | "invalidated"
  | "rejected";

export interface SiteRelationshipNomination {
  /** When this site recorded its own acceptance of the activation proposal. */
  readonly acceptedAt?: string;
  /** When bilateral confirmation completed and the local record activated. */
  readonly confirmedAt?: string;
  readonly correlationId: string;
  /** The other site in this setup: Green for a Blue record, Blue for Green's. */
  readonly counterpartSiteAri: string;
  readonly decidedAt?: string;
  readonly idempotencyKey: string;
  readonly invitationReference: string;
  readonly nominatedIdentity: NominatedIdentity;
  readonly receiverEndpointStatus: ReceiverEndpointStatus;
  /** Minted by Blue with its pending record; both sites must agree on it. */
  readonly relationshipId: string;
  readonly role: "blue" | "green";
  readonly safeReason?: string;
  readonly status: NominationStatus;
  readonly terms: NominationTerms;
}

export interface SiteRelationshipSetupState {
  readonly nominations: readonly SiteRelationshipNomination[];
  readonly processedIdempotencyKeys: readonly string[];
  /** Local Site relationships, written only on bilateral confirmation. */
  readonly relationships: readonly SiteRelationship[];
}

export interface NominateSiteRelationshipCommand {
  readonly actor: "blue-administrator";
  readonly consentedAt: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly intendedReceiverSiteAri: string;
  readonly invitationReference: string;
  readonly localIdentity: NominatedIdentity;
  readonly localReadiness: "blocked" | "ready";
  readonly operation: "site-relationship.nominate";
  readonly receiverEndpointStatus: ReceiverEndpointStatus;
  readonly relationshipId: string;
  readonly requestId: string;
  readonly terms: NominationTerms;
}

/**
 * The strict versioned envelope Blue signs and Green verifies. It deliberately
 * carries no secret, Jira content, or endpoint URL.
 */
export interface NominationRequest {
  readonly correlationId: string;
  readonly createdAt: string;
  readonly direction: SetupDirection;
  readonly idempotencyKey: string;
  readonly intendedReceiverSiteAri: string;
  readonly invitationReference: string;
  readonly nominatedIdentity: NominatedIdentity;
  readonly operation: "site-relationship.nominate";
  readonly protocolVersion: ProtocolVersion;
  readonly receiverEndpointStatus: ReceiverEndpointStatus;
  readonly relationshipId: string;
  readonly requestId: string;
  readonly terms: NominationTerms;
}

export interface NominationInitiationResult {
  readonly nextState: SiteRelationshipSetupState;
  readonly request: NominationRequest;
}

export type NominateSiteRelationshipError = {
  readonly code: "local-readiness-blocked";
};

export function nominateSiteRelationship(
  state: SiteRelationshipSetupState,
  command: NominateSiteRelationshipCommand,
): Result<NominationInitiationResult, NominateSiteRelationshipError> {
  if (command.localReadiness !== "ready") {
    return err({ code: "local-readiness-blocked" });
  }

  const recorded = state.nominations.find(
    (candidate) => candidate.idempotencyKey === command.idempotencyKey,
  );

  const nomination: SiteRelationshipNomination = Object.freeze({
    correlationId: command.correlationId,
    counterpartSiteAri: command.intendedReceiverSiteAri,
    idempotencyKey: command.idempotencyKey,
    invitationReference: command.invitationReference,
    nominatedIdentity: command.localIdentity,
    receiverEndpointStatus: command.receiverEndpointStatus,
    relationshipId: command.relationshipId,
    role: "blue" as const,
    status: "awaiting-green-approval" as const,
    terms: command.terms,
  });

  return ok({
    nextState: recorded
      ? state
      : {
          ...state,
          nominations: [...state.nominations, nomination],
          processedIdempotencyKeys: [
            ...state.processedIdempotencyKeys,
            command.idempotencyKey,
          ],
        },
    request: Object.freeze({
      correlationId: command.correlationId,
      createdAt: command.consentedAt,
      direction: "blue-to-green" as const,
      idempotencyKey: command.idempotencyKey,
      intendedReceiverSiteAri: command.intendedReceiverSiteAri,
      invitationReference: command.invitationReference,
      nominatedIdentity: command.localIdentity,
      operation: command.operation,
      protocolVersion: "v1" as const,
      receiverEndpointStatus: command.receiverEndpointStatus,
      relationshipId: command.relationshipId,
      requestId: command.requestId,
      terms: command.terms,
    }),
  });
}

export interface NominationReceiptContext {
  readonly invitations: InvitationWorkflowState;
  readonly localSiteAri: string;
  readonly now: string;
}

export interface NominationReceipt {
  readonly correlationId: string;
  readonly outcome: "awaiting-green-approval";
}

export interface NominationReceiptResult {
  readonly nextState: SiteRelationshipSetupState;
  readonly receipt: NominationReceipt;
}

/** Every denied nomination path. Reason codes are safe to record and return. */
export type ReceiveNominationError = {
  readonly code:
    | "invitation-expired"
    | "invitation-not-found"
    | "nomination-correlation-mismatch"
    | "nomination-receiver-mismatch"
    | "nomination-terms-mismatch";
};

/** Terms are immutable: the nomination must repeat the invitation exactly. */
function termsMatch(terms: NominationTerms, invitation: Invitation): boolean {
  return (
    terms.termsVersion === invitation.termsVersion &&
    terms.expiresAt === invitation.expiresAt &&
    terms.allowedOperations.length === invitation.allowedOperations.length &&
    terms.allowedOperations.every(
      (operation, index) => operation === invitation.allowedOperations[index],
    )
  );
}

/**
 * Applies one authenticated nomination on Green. The caller must already have
 * verified the request signature; this compares every peer-supplied field with
 * Green's own invitation state before recording anything.
 */
export function receiveSiteRelationshipNomination(
  state: SiteRelationshipSetupState,
  request: NominationRequest,
  context: NominationReceiptContext,
): Result<NominationReceiptResult, ReceiveNominationError> {
  if (request.intendedReceiverSiteAri !== context.localSiteAri) {
    return err({ code: "nomination-receiver-mismatch" });
  }

  const invitation = context.invitations.invitations.find(
    (candidate) => candidate.reference === request.invitationReference,
  );
  if (!invitation) {
    return err({ code: "invitation-not-found" });
  }

  // Blue learns the correlation ID only through the recipient-bound hand-off,
  // so a mismatch means this nomination did not follow the intended path.
  if (invitation.correlationId !== request.correlationId) {
    return err({ code: "nomination-correlation-mismatch" });
  }

  if (
    !Number.isFinite(Date.parse(context.now)) ||
    context.now >= invitation.expiresAt
  ) {
    return err({ code: "invitation-expired" });
  }

  if (!termsMatch(request.terms, invitation)) {
    return err({ code: "nomination-terms-mismatch" });
  }

  const nomination: SiteRelationshipNomination = Object.freeze({
    correlationId: request.correlationId,
    counterpartSiteAri: request.nominatedIdentity.siteAri,
    idempotencyKey: request.idempotencyKey,
    invitationReference: request.invitationReference,
    nominatedIdentity: request.nominatedIdentity,
    receiverEndpointStatus: request.receiverEndpointStatus,
    relationshipId: request.relationshipId,
    role: "green" as const,
    status: "awaiting-green-approval" as const,
    terms: request.terms,
  });

  const recorded = state.nominations.some(
    (candidate) =>
      candidate.role === "green" &&
      candidate.idempotencyKey === request.idempotencyKey,
  );

  return ok({
    nextState: recorded
      ? state
      : {
          ...state,
          nominations: [...state.nominations, nomination],
          processedIdempotencyKeys: [
            ...state.processedIdempotencyKeys,
            request.idempotencyKey,
          ],
        },
    receipt: {
      correlationId: request.correlationId,
      outcome: "awaiting-green-approval" as const,
    },
  });
}

export interface DecideNominationCommand {
  readonly actor: "green-administrator";
  readonly correlationId: string;
  readonly decidedAt: string;
  readonly decision: "approve" | "leave-pending" | "reject";
  readonly idempotencyKey: string;
  readonly reviewedIdentity: NominatedIdentity;
  readonly reviewedReceiverEndpointStatus: ReceiverEndpointStatus;
  readonly reviewedTerms: NominationTerms;
  readonly safeReason?: string;
}

export interface NominationDecisionResult {
  readonly nextState: SiteRelationshipSetupState;
  readonly outcome: NominationStatus;
}

export type DecideNominationError =
  | {
      readonly code: "nomination-changed";
      readonly nextState: SiteRelationshipSetupState;
    }
  | { readonly code: "pending-nomination-not-found" }
  | { readonly code: "safe-reason-required" };

/** Identities are compared whole: any differing ARI is a different site. */
export function identitiesMatch(
  reviewed: NominatedIdentity,
  nominated: NominatedIdentity,
): boolean {
  return (
    reviewed.environmentAri === nominated.environmentAri &&
    reviewed.installationAri === nominated.installationAri &&
    reviewed.siteAri === nominated.siteAri
  );
}

function reviewedTermsMatch(
  reviewed: NominationTerms,
  nominated: NominationTerms,
): boolean {
  return (
    reviewed.termsVersion === nominated.termsVersion &&
    reviewed.expiresAt === nominated.expiresAt &&
    reviewed.allowedOperations.length === nominated.allowedOperations.length &&
    reviewed.allowedOperations.every(
      (operation, index) => operation === nominated.allowedOperations[index],
    )
  );
}

/**
 * Applies the Green administrator's decision. The Forge admin page module is
 * the administrator gate; this records what was actually reviewed.
 */
export function decideSiteRelationshipNomination(
  state: SiteRelationshipSetupState,
  command: DecideNominationCommand,
): Result<NominationDecisionResult, DecideNominationError> {
  const nomination = state.nominations.find(
    (candidate) =>
      candidate.role === "green" &&
      candidate.status === "awaiting-green-approval" &&
      candidate.correlationId === command.correlationId,
  );

  if (!nomination) {
    return err({ code: "pending-nomination-not-found" });
  }

  const safeReason = command.safeReason?.trim();
  if (command.decision === "reject" && !safeReason) {
    return err({ code: "safe-reason-required" });
  }

  // Leaving a nomination pending is a deliberate non-decision: no authority is
  // granted, nothing is recorded, and the invitation's fixed expiry still runs.
  if (command.decision === "leave-pending") {
    return ok({ nextState: state, outcome: nomination.status });
  }

  // The decision binds exactly what the administrator reviewed. Any drift in
  // the nominated identity, scope, endpoint status, or terms voids the attempt.
  if (
    !identitiesMatch(command.reviewedIdentity, nomination.nominatedIdentity) ||
    !reviewedTermsMatch(command.reviewedTerms, nomination.terms) ||
    command.reviewedReceiverEndpointStatus !== nomination.receiverEndpointStatus
  ) {
    return err({
      code: "nomination-changed",
      nextState: {
        ...state,
        nominations: state.nominations.map((candidate) =>
          candidate === nomination
            ? {
                ...candidate,
                decidedAt: command.decidedAt,
                status: "invalidated" as const,
              }
            : candidate,
        ),
        processedIdempotencyKeys: [
          ...state.processedIdempotencyKeys,
          command.idempotencyKey,
        ],
      },
    });
  }

  const decided: SiteRelationshipNomination =
    command.decision === "reject"
      ? {
          ...nomination,
          decidedAt: command.decidedAt,
          ...(safeReason ? { safeReason } : {}),
          status: "rejected" as const,
        }
      : {
          ...nomination,
          decidedAt: command.decidedAt,
          status: "awaiting-blue-confirmation" as const,
        };

  return ok({
    nextState: {
      ...state,
      nominations: state.nominations.map((candidate) =>
        candidate === nomination ? decided : candidate,
      ),
      processedIdempotencyKeys: [
        ...state.processedIdempotencyKeys,
        command.idempotencyKey,
      ],
    },
    outcome: decided.status,
  });
}
