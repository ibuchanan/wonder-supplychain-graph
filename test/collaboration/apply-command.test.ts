import type { Result } from "@forge-ahead/errors";

import {
  applyCollaborationCommand,
  type CollaborationState,
} from "../../src/collaboration/apply-command";

function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.isOk()).toBe(true);

  if (result.isErr()) {
    expect.unreachable(
      `Expected success, received ${JSON.stringify(result.error)}`,
    );
  }

  return result.value;
}

const pendingInvitationState = (): CollaborationState => ({
  invitations: [
    {
      correlationId: "corr-001",
      invitationId: "invite-001",
      pairingId: "pairing-001",
      status: "pending",
    },
  ],
  processedIdempotencyKeys: [],
});

const acceptanceCommand = {
  acceptedAt: "2026-08-04T15:20:00.000Z",
  actor: "supplier-administrator",
  correlationId: "corr-001",
  idempotencyKey: "accept-pairing-001",
  invitationId: "invite-001",
  operation: "invitation.accept",
  pairingId: "pairing-001",
  protocolVersion: "v1",
} as const;

describe("applyCollaborationCommand", () => {
  it("accepts a pending invitation and records an immutable non-content audit event", () => {
    const result = expectOk(
      applyCollaborationCommand(pendingInvitationState(), acceptanceCommand),
    );

    expect(result.decision).toEqual({
      idempotency: "applied",
      pairingId: "pairing-001",
      status: "active",
    });
    expect(result.auditEvents).toEqual([
      {
        actor: "supplier-administrator",
        correlationId: "corr-001",
        eventId: "audit:accept-pairing-001",
        eventType: "pairing.accepted",
        idempotencyKey: "accept-pairing-001",
        occurredAt: "2026-08-04T15:20:00.000Z",
        pairingId: "pairing-001",
        protocolVersion: "v1",
      },
    ]);
    expect(Object.isFrozen(result.auditEvents[0])).toBe(true);
    expect(result.nextState.invitations).toEqual([
      {
        correlationId: "corr-001",
        invitationId: "invite-001",
        pairingId: "pairing-001",
        status: "accepted",
      },
    ]);
  });

  it("replays an accepted invitation without appending another audit event", () => {
    const firstResult = expectOk(
      applyCollaborationCommand(pendingInvitationState(), acceptanceCommand),
    );

    const replayResult = expectOk(
      applyCollaborationCommand(firstResult.nextState, acceptanceCommand),
    );

    expect(replayResult.decision).toEqual({
      idempotency: "replayed",
      pairingId: "pairing-001",
      status: "active",
    });
    expect(replayResult.auditEvents).toEqual([]);
    expect(replayResult.nextState).toEqual(firstResult.nextState);
  });

  it("returns a typed error when the command has no matching pending invitation", () => {
    const result = applyCollaborationCommand(
      { invitations: [], processedIdempotencyKeys: [] },
      acceptanceCommand,
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected a missing invitation to fail");
    }
    expect(result.error).toEqual({
      code: "pending-invitation-not-found",
      correlationId: "corr-001",
      invitationId: "invite-001",
      pairingId: "pairing-001",
    });
  });
});
