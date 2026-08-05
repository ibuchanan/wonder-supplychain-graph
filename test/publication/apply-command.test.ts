import type { Result } from "@forge-ahead/errors";

import {
  applyDeliveryFailureCommand,
  applyPublicationCancellationCommand,
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
  occurredAt: "2026-08-04T15:00:00.000Z",
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
    expect(result.auditEvents).toEqual([
      {
        candidateId: "candidate:event-one",
        correlationId: "corr-publish-001",
        eventId: "audit:event-one",
        eventType: "publication.queued",
        idempotencyKey: "event-one",
        occurredAt: "2026-08-04T15:00:00.000Z",
        pairingId: "pairing-001",
        protocolVersion: "v1",
      },
    ]);
  });

  it("reports a preflight failure for an inconsistent source and target relationship", () => {
    const state: PublicationState = {
      candidates: [],
      pairings: [],
      processedIdempotencyKeys: [],
    };

    const result = expectOk(
      applyPublicationCommand(state, validPublicationCommand),
    );

    expect(result.decision).toEqual({
      candidateId: "candidate:event-one",
      reason: "invalid-publication-pairing",
      state: "preflight-failed",
    });
    expect(result.deliveryRequests).toEqual([]);
    expect(result.auditEvents[0].reason).toBe("invalid-publication-pairing");
    expect(result.nextState).toEqual(state);
  });

  it("reports a preflight failure for a publisher other than the Automation connection user", () => {
    const state = activePairingState();

    const result = expectOk(
      applyPublicationCommand(state, {
        ...validPublicationCommand,
        publisherId: "account:untrusted-user",
      }),
    );

    expect(result.decision).toEqual({
      candidateId: "candidate:event-one",
      reason: "automation-user-not-authorized",
      state: "preflight-failed",
    });
    expect(result.deliveryRequests).toEqual([]);
    expect(result.auditEvents[0].reason).toBe("automation-user-not-authorized");
    expect(result.nextState).toEqual(state);
  });

  it("reports an administrator-visible preflight failure for an invalid fixed schema", () => {
    const state = activePairingState();

    const result = expectOk(
      applyPublicationCommand(state, {
        ...validPublicationCommand,
        preflight: { ...validPublicationCommand.preflight, schema: "invalid" },
      }),
    );

    expect(result.decision).toEqual({
      candidateId: "candidate:event-one",
      reason: "invalid-snapshot-schema",
      state: "preflight-failed",
    });
    expect(result.deliveryRequests).toEqual([]);
    expect(result.auditEvents).toEqual([
      {
        candidateId: "candidate:event-one",
        correlationId: "corr-publish-001",
        eventId: "audit:event-one",
        eventType: "publication.preflight-failed",
        idempotencyKey: "event-one",
        occurredAt: "2026-08-04T15:00:00.000Z",
        pairingId: "pairing-001",
        protocolVersion: "v1",
        reason: "invalid-snapshot-schema",
      },
    ]);
    // A failed preflight queues nothing, so a corrected retry can re-run it.
    expect(result.nextState).toEqual(state);
  });

  it.each([
    {
      name: "a publisher that no longer has Source Epic access",
      preflight: { sourceAccess: "denied" },
      reason: "source-epic-access-denied",
    },
    {
      name: "a configured Automation user without publishing authority",
      preflight: { publishingAuthority: "denied" },
      reason: "publishing-authority-denied",
    },
  ])(
    "reports an administrator-visible preflight failure for $name",
    ({ preflight, reason }) => {
      const state = activePairingState();

      const result = expectOk(
        applyPublicationCommand(state, {
          ...validPublicationCommand,
          preflight: { ...validPublicationCommand.preflight, ...preflight },
        }),
      );

      expect(result.decision).toEqual({
        candidateId: "candidate:event-one",
        reason,
        state: "preflight-failed",
      });
      expect(result.deliveryRequests).toEqual([]);
      expect(result.auditEvents).toEqual([
        {
          candidateId: "candidate:event-one",
          correlationId: "corr-publish-001",
          eventId: "audit:event-one",
          eventType: "publication.preflight-failed",
          idempotencyKey: "event-one",
          occurredAt: "2026-08-04T15:00:00.000Z",
          pairingId: "pairing-001",
          protocolVersion: "v1",
          reason,
        },
      ]);
      expect(result.nextState).toEqual(state);
    },
  );

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

describe("applyDeliveryFailureCommand", () => {
  const queuedCandidateState = (): PublicationState => ({
    candidates: [
      {
        candidateId: "candidate:event-one",
        correlationId: "corr-publish-001",
        pairedEpicId: "SUP-42",
        pairingId: "pairing-001",
        publisherId: "account:automation-001",
        sourceEpicId: "MFG-17",
        state: "queued",
      },
    ],
    currentVersion: { publishedAt: "2026-08-03T16:00:00.000Z", version: "1" },
    pairings: activePairingState().pairings,
    processedIdempotencyKeys: ["event-one"],
  });

  const failureCommand = {
    candidateId: "candidate:event-one",
    correlationId: "corr-publish-001",
    idempotencyKey: "failure-one",
    occurredAt: "2026-08-04T15:30:00.000Z",
    operation: "snapshot.candidate.fail",
    pairingId: "pairing-001",
    protocolVersion: "v1",
    reason: "retries-exhausted",
  } as const;

  it("fails the candidate terminally and keeps the prior current version", () => {
    const state = queuedCandidateState();

    const result = expectOk(applyDeliveryFailureCommand(state, failureCommand));

    expect(result.decision).toEqual({
      candidateId: "candidate:event-one",
      reason: "retries-exhausted",
      state: "failed",
    });
    expect(result.auditEvents).toEqual([
      {
        candidateId: "candidate:event-one",
        correlationId: "corr-publish-001",
        eventId: "audit:failure-one",
        eventType: "publication.delivery-failed",
        idempotencyKey: "failure-one",
        occurredAt: "2026-08-04T15:30:00.000Z",
        pairingId: "pairing-001",
        protocolVersion: "v1",
        reason: "retries-exhausted",
      },
    ]);
    expect(result.nextState.candidates).toEqual([
      { ...state.candidates[0], state: "failed" },
    ]);
    expect(result.nextState.currentVersion).toEqual({
      publishedAt: "2026-08-03T16:00:00.000Z",
      version: "1",
    });
  });

  it("returns a typed error when the candidate is not queued locally", () => {
    const result = applyDeliveryFailureCommand(
      { ...queuedCandidateState(), candidates: [] },
      failureCommand,
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an unknown candidate to fail");
    }
    expect(result.error).toEqual({
      candidateId: "candidate:event-one",
      code: "candidate-not-found",
      pairingId: "pairing-001",
    });
  });
});

describe("applyPublicationCancellationCommand", () => {
  const queuedCandidateState = (): PublicationState => ({
    candidates: [
      {
        candidateId: "candidate:event-one",
        correlationId: "corr-publish-001",
        pairedEpicId: "SUP-42",
        pairingId: "pairing-001",
        publisherId: "account:automation-001",
        sourceEpicId: "MFG-17",
        state: "queued",
      },
    ],
    currentVersion: { publishedAt: "2026-08-03T16:00:00.000Z", version: "1" },
    pairings: activePairingState().pairings,
    processedIdempotencyKeys: ["event-one"],
  });

  it("cancels only the candidate and keeps the prior current version", () => {
    const state = queuedCandidateState();

    const result = expectOk(
      applyPublicationCancellationCommand(state, {
        actor: "site-administrator",
        actorId: "account:site-admin",
        candidateId: "candidate:event-one",
        correlationId: "corr-publish-001",
        idempotencyKey: "cancel-one",
        occurredAt: "2026-08-04T15:45:00.000Z",
        operation: "candidate.cancel",
        pairingId: "pairing-001",
        protocolVersion: "v1",
        reason: "superseded-by-newer-source-change",
      }),
    );

    expect(result.decision).toEqual({
      candidateId: "candidate:event-one",
      state: "cancelled",
    });
    expect(result.auditEvents).toEqual([
      {
        actor: "site-administrator",
        actorId: "account:site-admin",
        candidateId: "candidate:event-one",
        correlationId: "corr-publish-001",
        eventId: "audit:cancel-one",
        eventType: "publication.candidate-cancelled",
        idempotencyKey: "cancel-one",
        occurredAt: "2026-08-04T15:45:00.000Z",
        pairingId: "pairing-001",
        protocolVersion: "v1",
        reason: "superseded-by-newer-source-change",
      },
    ]);
    expect(result.nextState.candidates).toEqual([
      { ...state.candidates[0], state: "cancelled" },
    ]);
    expect(result.nextState.currentVersion).toEqual({
      publishedAt: "2026-08-03T16:00:00.000Z",
      version: "1",
    });
  });
});

describe("publication recovery", () => {
  it("keeps the prior current version when a failed candidate is retried", () => {
    const queued = expectOk(
      applyPublicationCommand(
        {
          ...activePairingState(),
          currentVersion: {
            publishedAt: "2026-08-03T16:00:00.000Z",
            version: "1",
          },
        },
        validPublicationCommand,
      ),
    );

    const failed = expectOk(
      applyDeliveryFailureCommand(queued.nextState, {
        candidateId: "candidate:event-one",
        correlationId: "corr-publish-001",
        idempotencyKey: "failure-one",
        occurredAt: "2026-08-04T15:30:00.000Z",
        operation: "snapshot.candidate.fail",
        pairingId: "pairing-001",
        protocolVersion: "v1",
        reason: "terminal-error",
      }),
    );

    // A retry is a fresh Automation event, so it carries a new idempotency key.
    const retried = expectOk(
      applyPublicationCommand(failed.nextState, {
        ...validPublicationCommand,
        correlationId: "corr-publish-002",
        idempotencyKey: "event-two",
        occurredAt: "2026-08-04T16:00:00.000Z",
      }),
    );

    expect(retried.decision).toEqual({
      candidateId: "candidate:event-two",
      idempotency: "applied",
      state: "queued",
    });
    expect(retried.nextState.currentVersion).toEqual({
      publishedAt: "2026-08-03T16:00:00.000Z",
      version: "1",
    });
    expect(
      retried.nextState.candidates.map((candidate) => [
        candidate.candidateId,
        candidate.state,
      ]),
    ).toEqual([
      ["candidate:event-one", "failed"],
      ["candidate:event-two", "queued"],
    ]);
  });
});
