import {
  applyCollaborationCommand,
  type CollaborationState,
} from "../../src/collaboration/apply-command";

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
    const result = applyCollaborationCommand(
      pendingInvitationState(),
      acceptanceCommand,
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
    const firstResult = applyCollaborationCommand(
      pendingInvitationState(),
      acceptanceCommand,
    );

    const replayResult = applyCollaborationCommand(
      firstResult.nextState,
      acceptanceCommand,
    );

    expect(replayResult.decision).toEqual({
      idempotency: "replayed",
      pairingId: "pairing-001",
      status: "active",
    });
    expect(replayResult.auditEvents).toEqual([]);
    expect(replayResult.nextState).toEqual(firstResult.nextState);
  });
});
