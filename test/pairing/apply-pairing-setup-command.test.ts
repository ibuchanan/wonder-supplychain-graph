import type { Result } from "@forge-ahead/errors";

import {
  applyPairingSetupCommand,
  type PairingSetupState,
} from "../../src/pairing/apply-pairing-setup-command";

function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.isOk()).toBe(true);

  if (result.isErr()) {
    expect.unreachable(
      `Expected success, received ${JSON.stringify(result.error)}`,
    );
  }

  return result.value;
}

const emptyPairingState = (): PairingSetupState => ({
  localPairings: [],
  processedIdempotencyKeys: [],
});

const initiationCommand = {
  actor: "manufacturer-administrator",
  appEnvironment: "development",
  correlationId: "corr-pairing-001",
  createdAt: "2026-08-04T16:05:00.000Z",
  idempotencyKey: "initiate-pairing-001",
  manufacturerSiteName: "Acme Manufacturing",
  operation: "pairing.initiate",
  pairingId: "pairing-001",
  pairingReferenceId: "reference-001",
  protocolVersion: "v1",
  sourceEpicLocalId: "source-epic-local-001",
} as const;

const acceptanceCommand = {
  acceptedAt: "2026-08-04T16:06:00.000Z",
  actor: "supplier-administrator",
  correlationId: "corr-pairing-001",
  idempotencyKey: "accept-pairing-001",
  invitationId: "invite-pairing-001",
  operation: "pairing.accept",
  pairedEpicLocalId: "paired-epic-local-001",
  pairingId: "pairing-001",
  pairingReferenceId: "reference-001",
  protocolVersion: "v1",
} as const;

const peerAcceptanceApplicationCommand = {
  actor: "manufacturer-system",
  appliedAt: "2026-08-04T16:07:00.000Z",
  correlationId: "corr-pairing-001",
  idempotencyKey: "apply-acceptance-001",
  operation: "pairing.apply-peer-acceptance",
  pairingId: "pairing-001",
  protocolVersion: "v1",
} as const;

describe("applyPairingSetupCommand", () => {
  it("creates a minimal non-secret pairing reference for a manufacturer-local Source Epic", () => {
    const result = expectOk(
      applyPairingSetupCommand(emptyPairingState(), initiationCommand),
    );

    expect(result.pairingReference).toEqual({
      appEnvironment: "development",
      correlationId: "corr-pairing-001",
      manufacturerSiteName: "Acme Manufacturing",
      pairingReferenceId: "reference-001",
      purpose: "establish-pairing",
    });
    expect(result.nextState.localPairings).toEqual([
      {
        correlationId: "corr-pairing-001",
        pairingId: "pairing-001",
        role: "manufacturer",
        sourceEpicLocalId: "source-epic-local-001",
        status: "awaiting-supplier-acceptance",
      },
    ]);
    expect(result.auditEvents).toEqual([
      {
        actor: "manufacturer-administrator",
        correlationId: "corr-pairing-001",
        eventId: "audit:initiate-pairing-001",
        eventType: "pairing.initiated",
        idempotencyKey: "initiate-pairing-001",
        occurredAt: "2026-08-04T16:05:00.000Z",
        pairingId: "pairing-001",
        protocolVersion: "v1",
      },
    ]);
    expect(Object.isFrozen(result.auditEvents[0])).toBe(true);
  });

  it("records supplier acceptance for an existing Paired Epic and emits the peer acceptance command", () => {
    const result = expectOk(
      applyPairingSetupCommand(emptyPairingState(), acceptanceCommand),
    );

    expect(result.outboundAcceptance).toEqual({
      acceptedAt: "2026-08-04T16:06:00.000Z",
      actor: "supplier-administrator",
      correlationId: "corr-pairing-001",
      idempotencyKey: "accept-pairing-001",
      invitationId: "invite-pairing-001",
      operation: "invitation.accept",
      pairingId: "pairing-001",
      protocolVersion: "v1",
    });
    expect(result.nextState.localPairings).toEqual([
      {
        correlationId: "corr-pairing-001",
        pairedEpicLocalId: "paired-epic-local-001",
        pairingId: "pairing-001",
        role: "supplier",
        status: "accepted-awaiting-peer-application",
      },
    ]);
    expect(result.auditEvents).toEqual([
      {
        actor: "supplier-administrator",
        correlationId: "corr-pairing-001",
        eventId: "audit:accept-pairing-001",
        eventType: "pairing.accepted-locally",
        idempotencyKey: "accept-pairing-001",
        occurredAt: "2026-08-04T16:06:00.000Z",
        pairingId: "pairing-001",
        protocolVersion: "v1",
      },
    ]);
    expect(Object.isFrozen(result.auditEvents[0])).toBe(true);
  });

  it("activates the manufacturer-local pairing when supplier acceptance is applied", () => {
    const initiatedPairing = expectOk(
      applyPairingSetupCommand(emptyPairingState(), initiationCommand),
    );
    const result = expectOk(
      applyPairingSetupCommand(
        initiatedPairing.nextState,
        peerAcceptanceApplicationCommand,
      ),
    );

    expect(result.nextState.localPairings).toEqual([
      {
        correlationId: "corr-pairing-001",
        pairingId: "pairing-001",
        role: "manufacturer",
        sourceEpicLocalId: "source-epic-local-001",
        status: "active",
      },
    ]);
    expect(result.auditEvents).toEqual([
      {
        actor: "manufacturer-system",
        correlationId: "corr-pairing-001",
        eventId: "audit:apply-acceptance-001",
        eventType: "pairing.activated",
        idempotencyKey: "apply-acceptance-001",
        occurredAt: "2026-08-04T16:07:00.000Z",
        pairingId: "pairing-001",
        protocolVersion: "v1",
      },
    ]);
    expect(Object.isFrozen(result.auditEvents[0])).toBe(true);
  });

  it("returns a typed error when a pairing reference has already bound a Paired Epic", () => {
    const acceptedPairing = expectOk(
      applyPairingSetupCommand(emptyPairingState(), acceptanceCommand),
    );
    const result = applyPairingSetupCommand(acceptedPairing.nextState, {
      ...acceptanceCommand,
      idempotencyKey: "accept-pairing-002",
      pairedEpicLocalId: "paired-epic-local-002",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected a reused pairing reference to fail");
    }
    expect(result.error).toEqual({
      code: "pairing-reference-already-used",
      pairingReferenceId: "reference-001",
    });
  });

  it("returns a typed error when peer acceptance has no pending manufacturer pairing", () => {
    const result = applyPairingSetupCommand(
      emptyPairingState(),
      peerAcceptanceApplicationCommand,
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected peer acceptance without a pairing to fail");
    }
    expect(result.error).toEqual({
      code: "pending-manufacturer-pairing-not-found",
      correlationId: "corr-pairing-001",
      pairingId: "pairing-001",
    });
  });
});
