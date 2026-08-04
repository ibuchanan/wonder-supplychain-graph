import type { Result } from "@forge-ahead/errors";

import {
  applyPublicationCommand,
  type PublicationState,
} from "../../src/publication/apply-command";

function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.isOk()).toBe(true);

  if (result.isErr()) {
    expect.unreachable(
      `Expected success, received ${JSON.stringify(result.error)}`,
    );
  }

  return result.value;
}

const activePairingState = (): PublicationState => ({
  candidates: [],
  pairings: [
    {
      automationConnectionUserId: "account:automation-001",
      pairedEpicId: "SUP-42",
      pairingId: "pairing-001",
      sourceEpicId: "MFG-17",
      status: "active",
    },
  ],
  processedIdempotencyKeys: [],
});

const validPublicationCommand = {
  correlationId: "corr-publish-001",
  idempotencyKey: "event-one",
  operation: "snapshot.candidate.create",
  pairingId: "pairing-001",
  preflight: {
    publishingAuthority: "granted",
    schema: "valid",
    sourceAccess: "granted",
  },
  protocolVersion: "v1",
  publisherId: "account:automation-001",
  sourceEpicId: "MFG-17",
} as const;

describe("applyPublicationCommand", () => {
  it("queues a non-content candidate and delivery work for an authorized paired Source Epic", () => {
    const result = expectOk(
      applyPublicationCommand(activePairingState(), validPublicationCommand),
    );

    expect(result.decision).toEqual({
      candidateId: "candidate:event-one",
      idempotency: "applied",
      state: "queued",
    });
    expect(result.deliveryRequests).toEqual([
      {
        candidateId: "candidate:event-one",
        correlationId: "corr-publish-001",
        idempotencyKey: "event-one",
        operation: "snapshot.candidate.deliver",
        pairingId: "pairing-001",
        protocolVersion: "v1",
      },
    ]);
    expect(result.nextState.candidates).toEqual([
      {
        candidateId: "candidate:event-one",
        correlationId: "corr-publish-001",
        pairedEpicId: "SUP-42",
        pairingId: "pairing-001",
        publisherId: "account:automation-001",
        sourceEpicId: "MFG-17",
        state: "queued",
      },
    ]);
  });

  it("rejects an invalid pairing without creating a candidate or delivery work", () => {
    const result = applyPublicationCommand(
      { candidates: [], pairings: [], processedIdempotencyKeys: [] },
      validPublicationCommand,
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an invalid pairing to fail preflight");
    }
    expect(result.error).toEqual({
      code: "invalid-publication-pairing",
      pairingId: "pairing-001",
      sourceEpicId: "MFG-17",
    });
  });

  it("rejects a publisher other than the configured Automation connection user", () => {
    const result = applyPublicationCommand(activePairingState(), {
      ...validPublicationCommand,
      publisherId: "account:untrusted-user",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an untrusted publisher to fail preflight");
    }
    expect(result.error).toEqual({
      code: "automation-user-not-authorized",
      pairingId: "pairing-001",
      publisherId: "account:untrusted-user",
    });
  });

  it("rejects an invalid fixed schema without exposing snapshot content", () => {
    const result = applyPublicationCommand(activePairingState(), {
      ...validPublicationCommand,
      preflight: { ...validPublicationCommand.preflight, schema: "invalid" },
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an invalid schema to fail preflight");
    }
    expect(result.error).toEqual({
      code: "invalid-snapshot-schema",
      pairingId: "pairing-001",
      sourceEpicId: "MFG-17",
    });
  });

  it("rejects a publisher that no longer has Source Epic access", () => {
    const result = applyPublicationCommand(activePairingState(), {
      ...validPublicationCommand,
      preflight: {
        ...validPublicationCommand.preflight,
        sourceAccess: "denied",
      },
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected denied source access to fail preflight");
    }
    expect(result.error).toEqual({
      code: "source-epic-access-denied",
      sourceEpicId: "MFG-17",
    });
  });

  it("rejects a configured Automation user without publishing authority", () => {
    const result = applyPublicationCommand(activePairingState(), {
      ...validPublicationCommand,
      preflight: {
        ...validPublicationCommand.preflight,
        publishingAuthority: "denied",
      },
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable(
        "Expected denied publishing authority to fail preflight",
      );
    }
    expect(result.error).toEqual({
      code: "publishing-authority-denied",
      publisherId: "account:automation-001",
    });
  });

  it("replays a duplicate Automation event without another candidate or delivery request", () => {
    const firstResult = expectOk(
      applyPublicationCommand(activePairingState(), validPublicationCommand),
    );

    const replayResult = expectOk(
      applyPublicationCommand(firstResult.nextState, validPublicationCommand),
    );

    expect(replayResult.decision).toEqual({
      candidateId: "candidate:event-one",
      idempotency: "replayed",
      state: "queued",
    });
    expect(replayResult.deliveryRequests).toEqual([]);
    expect(replayResult.nextState).toEqual(firstResult.nextState);
  });
});
