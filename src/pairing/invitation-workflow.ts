import { err, ok, type Result } from "@forge-ahead/errors";

import type { PeerOperation } from "../collaboration/protocol";

export interface Invitation {
  readonly allowedOperations: readonly PeerOperation[];
  readonly correlationId: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly invitationId: string;
  readonly purpose: string;
  readonly recipientAccountId: string;
  readonly reference: string;
  readonly safeLabel?: string;
  readonly status: "invited";
  readonly termsVersion: string;
}

export interface InvitationWorkflowState {
  readonly invitations: readonly Invitation[];
}

export interface CreateInvitationRequest {
  readonly allowedOperations: readonly PeerOperation[];
  readonly createdAt: string;
  readonly greenNavigationUrl: string;
  readonly purpose: string;
  readonly recipientAccountId: string;
  readonly safeLabel?: string;
  readonly termsVersion: string;
}

export interface InvitationWorkflowDependencies {
  readonly randomUUID: () => string;
}

export interface InvitationCreationResult {
  readonly invitation: Invitation;
  readonly navigationUrl: string;
  readonly nextState: InvitationWorkflowState;
}

export interface InvitationDetails {
  readonly allowedOperations: readonly PeerOperation[];
  readonly correlationId: string;
  readonly expiresAt: string;
  readonly purpose: string;
  readonly safeLabel?: string;
  readonly termsVersion: string;
}

export type ReadInvitationError = {
  readonly code:
    | "invitation-expired"
    | "invitation-not-found"
    | "invitation-recipient-mismatch";
};

const runtimeDependencies: InvitationWorkflowDependencies = {
  randomUUID: () => globalThis.crypto.randomUUID(),
};

export function createInvitation(
  state: InvitationWorkflowState,
  request: CreateInvitationRequest,
  dependencies: InvitationWorkflowDependencies = runtimeDependencies,
): InvitationCreationResult {
  const invitationId = dependencies.randomUUID();
  const correlationId = dependencies.randomUUID();

  const invitation = Object.freeze({
    allowedOperations: Object.freeze([...request.allowedOperations]),
    correlationId,
    createdAt: request.createdAt,
    expiresAt: new Date(
      new Date(request.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    invitationId,
    purpose: request.purpose,
    recipientAccountId: request.recipientAccountId,
    reference: dependencies.randomUUID(),
    ...(request.safeLabel ? { safeLabel: request.safeLabel } : {}),
    status: "invited" as const,
    termsVersion: request.termsVersion,
  });

  const navigationUrl = new URL(request.greenNavigationUrl);
  navigationUrl.searchParams.set("invitation", invitation.reference);

  return {
    invitation,
    navigationUrl: navigationUrl.toString(),
    nextState: { invitations: [...state.invitations, invitation] },
  };
}

export function readInvitation(
  state: InvitationWorkflowState,
  reference: string,
  authenticatedAccountId: string,
  now = new Date().toISOString(),
): Result<InvitationDetails, ReadInvitationError> {
  const invitation = state.invitations.find(
    (candidate) => candidate.reference === reference,
  );

  if (!invitation) {
    return err({ code: "invitation-not-found" });
  }

  if (invitation.recipientAccountId !== authenticatedAccountId) {
    return err({ code: "invitation-recipient-mismatch" });
  }

  if (!Number.isFinite(Date.parse(now)) || now >= invitation.expiresAt) {
    return err({ code: "invitation-expired" });
  }

  return ok({
    allowedOperations: invitation.allowedOperations,
    correlationId: invitation.correlationId,
    expiresAt: invitation.expiresAt,
    purpose: invitation.purpose,
    ...(invitation.safeLabel ? { safeLabel: invitation.safeLabel } : {}),
    termsVersion: invitation.termsVersion,
  });
}
