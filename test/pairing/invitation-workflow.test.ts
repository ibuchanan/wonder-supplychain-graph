import { describe, expect, it } from "vitest";

import {
  createInvitation,
  type InvitationWorkflowState,
  readInvitation,
} from "../../src/pairing/invitation-workflow";

const emptyState = (): InvitationWorkflowState => ({ invitations: [] });

const invitationRequest = {
  allowedOperations: ["starter.delivery"] as const,
  createdAt: "2026-09-14T12:00:00.000Z",
  greenNavigationUrl: "https://green.example/apps/peer-invitation",
  purpose: "Coordinate supplier delivery",
  recipientAccountId: "tina-green-account",
  termsVersion: "v1",
  safeLabel: "Acme supplier setup",
} as const;

describe("invitation workflow", () => {
  it("creates a recipient-bound invitation with immutable scope and a seven-day expiry", () => {
    const result = createInvitation(emptyState(), invitationRequest, {
      randomUUID: (() => {
        const ids = ["invitation-001", "correlation-001", "reference-001"];
        let index = 0;

        return () => {
          const id = ids[index];
          index += 1;
          if (!id) {
            throw new Error("Unexpected identifier request");
          }

          return id;
        };
      })(),
    });

    expect(result.invitation).toEqual({
      allowedOperations: ["starter.delivery"],
      correlationId: "correlation-001",
      createdAt: "2026-09-14T12:00:00.000Z",
      expiresAt: "2026-09-21T12:00:00.000Z",
      invitationId: "invitation-001",
      purpose: "Coordinate supplier delivery",
      recipientAccountId: "tina-green-account",
      reference: "reference-001",
      safeLabel: "Acme supplier setup",
      status: "invited",
      termsVersion: "v1",
    });
    expect(result.nextState.invitations).toEqual([result.invitation]);
    expect(result.navigationUrl).toBe(
      "https://green.example/apps/peer-invitation?invitation=reference-001",
    );
  });

  it("reveals approved invitation details only to its named recipient", () => {
    const { invitation, nextState } = createInvitation(
      emptyState(),
      invitationRequest,
      { randomUUID: () => "id" },
    );

    const result = readInvitation(
      nextState,
      invitation.reference,
      "tina-green-account",
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected the named recipient to read the invitation");
    }
    expect(result.value).toEqual({
      allowedOperations: ["starter.delivery"],
      correlationId: "id",
      expiresAt: "2026-09-21T12:00:00.000Z",
      purpose: "Coordinate supplier delivery",
      safeLabel: "Acme supplier setup",
      termsVersion: "v1",
    });
  });

  it("withholds invitation details after the fixed setup expiry", () => {
    const { invitation, nextState } = createInvitation(
      emptyState(),
      invitationRequest,
      { randomUUID: () => "id" },
    );

    const result = readInvitation(
      nextState,
      invitation.reference,
      "tina-green-account",
      "2026-09-21T12:00:00.000Z",
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected the expired invitation to be withheld");
    }
    expect(result.error).toEqual({ code: "invitation-expired" });
  });

  it("withholds invitation details when a forwarded reference is opened by another account", () => {
    const { invitation, nextState } = createInvitation(
      emptyState(),
      invitationRequest,
      { randomUUID: () => "id" },
    );

    const result = readInvitation(
      nextState,
      invitation.reference,
      "forwarded-account",
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected a forwarded invitation to be withheld");
    }
    expect(result.error).toEqual({ code: "invitation-recipient-mismatch" });
  });
});
