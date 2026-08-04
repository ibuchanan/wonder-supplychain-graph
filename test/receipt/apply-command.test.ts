import type { Result } from "@forge-ahead/errors";

import {
  applySupplierCandidateCancellationCommand,
  applySupplierReceiptCommand,
  type SupplierReceiptState,
} from "../../src/receipt/apply-command";

function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.isOk()).toBe(true);

  if (result.isErr()) {
    expect.unreachable(
      `Expected success, received ${JSON.stringify(result.error)}`,
    );
  }

  return result.value;
}

const activeSupplierState = (): SupplierReceiptState => ({
  currentPackage: {
    content: {
      children: [],
      epic: {
        description: "Previously published supplier package.",
        issueType: "Epic",
        key: "MFG-17",
        priority: "Medium",
        statusCategory: "In Progress",
        summary: "Previous package",
      },
    },
    correlationId: "corr-previous",
    pairedEpicId: "SUP-42",
    pairingId: "pairing-001",
    publishedAt: "2026-08-03T12:00:00.000Z",
    publisherId: "account:automation-001",
    sourceSiteId: "site:manufacturer-001",
    sourceEpicId: "MFG-17",
    version: "1",
  },
  pairings: [
    {
      expectedPeerInstallationId: "installation:manufacturer-001",
      pairedEpicId: "SUP-42",
      pairingId: "pairing-001",
      sourceEpicId: "MFG-17",
      status: "active",
    },
  ],
  processedIdempotencyKeys: [],
});

const validReceiptCommand = {
  authorization: "granted",
  correlationId: "corr-receipt-002",
  idempotencyKey: "receipt-event-002",
  operation: "snapshot.candidate.receive",
  peerInstallationId: "installation:manufacturer-001",
  protocolVersion: "v1",
  snapshot: {
    content: {
      children: [
        {
          description: "Deliver the supplier work.",
          issueType: "Story",
          key: "MFG-18",
          priority: "High",
          statusCategory: "To Do",
          summary: "Supplier delivery",
        },
      ],
      epic: {
        description: "The latest approved source package.",
        issueType: "Epic",
        key: "MFG-17",
        priority: "High",
        statusCategory: "In Progress",
        summary: "Approved package",
      },
    },
    pairedEpicId: "SUP-42",
    pairingId: "pairing-001",
    publishedAt: "2026-08-04T15:30:00.000Z",
    publisherId: "account:automation-001",
    sourceEpicId: "MFG-17",
    sourceSiteId: "site:manufacturer-001",
    version: "2",
  },
} as const;

describe("applySupplierReceiptCommand", () => {
  it("promotes a validated candidate as the single current package and records non-content receipt evidence", () => {
    const result = expectOk(
      applySupplierReceiptCommand(activeSupplierState(), validReceiptCommand),
    );

    expect(result.decision).toEqual({
      idempotency: "applied",
      state: "published",
      version: "2",
    });
    expect(result.auditEvents).toEqual([
      {
        correlationId: "corr-receipt-002",
        eventId: "audit:receipt-event-002",
        eventType: "snapshot.received-and-promoted",
        idempotencyKey: "receipt-event-002",
        occurredAt: "2026-08-04T15:30:00.000Z",
        pairingId: "pairing-001",
        protocolVersion: "v1",
      },
    ]);
    expect(result.nextState.currentPackage).toEqual({
      content: validReceiptCommand.snapshot.content,
      correlationId: "corr-receipt-002",
      pairedEpicId: "SUP-42",
      pairingId: "pairing-001",
      publishedAt: "2026-08-04T15:30:00.000Z",
      publisherId: "account:automation-001",
      sourceSiteId: "site:manufacturer-001",
      sourceEpicId: "MFG-17",
      version: "2",
    });
    expect(result.nextState.processedIdempotencyKeys).toEqual([
      "receipt-event-002",
    ]);
  });

  it.each([
    {
      command: { ...validReceiptCommand, correlationId: "" },
      error: { code: "invalid-correlation-id" },
      name: "a blank correlation ID",
    },
    {
      command: { ...validReceiptCommand, idempotencyKey: "" },
      error: { code: "invalid-idempotency-key" },
      name: "a blank idempotency key",
    },
    {
      command: {
        ...validReceiptCommand,
        protocolVersion: "v2" as never,
      },
      error: { code: "unsupported-protocol-version", protocolVersion: "v2" },
      name: "an unsupported protocol version",
    },
  ])("rejects a receipt with $name before promotion", ({ command, error }) => {
    const state = activeSupplierState();
    const result = applySupplierReceiptCommand(state, command);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an invalid peer envelope to fail");
    }
    expect(result.error).toEqual(error);
    expect(state.currentPackage?.version).toBe("1");
  });

  it("rejects a receipt that does not match the active supplier pairing", () => {
    const state = activeSupplierState();

    const result = applySupplierReceiptCommand(state, {
      ...validReceiptCommand,
      peerInstallationId: "installation:unexpected-peer",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected a mismatched peer identity to fail");
    }
    expect(result.error).toEqual({
      code: "unexpected-peer-installation",
      pairingId: "pairing-001",
      peerInstallationId: "installation:unexpected-peer",
    });
    expect(state.currentPackage?.version).toBe("1");
  });

  it("replays a delivered candidate without another promotion or audit event", () => {
    const firstResult = expectOk(
      applySupplierReceiptCommand(activeSupplierState(), validReceiptCommand),
    );

    const replayResult = expectOk(
      applySupplierReceiptCommand(firstResult.nextState, validReceiptCommand),
    );

    expect(replayResult.decision).toEqual({
      idempotency: "replayed",
      state: "published",
      version: "2",
    });
    expect(replayResult.auditEvents).toEqual([]);
    expect(replayResult.nextState).toEqual(firstResult.nextState);
  });

  it("records candidate cancellation without replacing the current package", () => {
    const state = activeSupplierState();

    const result = expectOk(
      applySupplierCandidateCancellationCommand(state, {
        authorization: "granted",
        candidateId: "candidate:receipt-event-003",
        correlationId: "corr-cancel-003",
        idempotencyKey: "cancel-event-003",
        operation: "candidate.cancel",
        pairedEpicId: "SUP-42",
        pairingId: "pairing-001",
        peerInstallationId: "installation:manufacturer-001",
        protocolVersion: "v1",
        sourceEpicId: "MFG-17",
      }),
    );

    expect(result.decision).toEqual({
      idempotency: "applied",
      state: "cancelled",
    });
    expect(result.auditEvents).toEqual([
      {
        candidateId: "candidate:receipt-event-003",
        correlationId: "corr-cancel-003",
        eventId: "audit:cancel-event-003",
        eventType: "snapshot.candidate.cancelled",
        idempotencyKey: "cancel-event-003",
        pairingId: "pairing-001",
        protocolVersion: "v1",
      },
    ]);
    expect(result.nextState.currentPackage).toEqual(state.currentPackage);
    expect(result.nextState.processedIdempotencyKeys).toEqual([
      "cancel-event-003",
    ]);
  });

  it("rejects a malformed fixed-schema candidate without replacing the current package", () => {
    const state = activeSupplierState();

    const result = applySupplierReceiptCommand(state, {
      ...validReceiptCommand,
      snapshot: {
        ...validReceiptCommand.snapshot,
        content: {
          ...validReceiptCommand.snapshot.content,
          epic: {
            ...validReceiptCommand.snapshot.content.epic,
            labels: ["not-in-v1-schema"],
          } as unknown as typeof validReceiptCommand.snapshot.content.epic,
        },
      },
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected a malformed fixed-schema candidate to fail");
    }
    expect(result.error).toEqual({
      code: "invalid-snapshot-schema",
      pairingId: "pairing-001",
      sourceEpicId: "MFG-17",
    });
    expect(result.nextState).toBeUndefined();
    expect(state.currentPackage?.version).toBe("1");
  });

  it("rejects an unauthorized peer without replacing the current package", () => {
    const state = activeSupplierState();

    const result = applySupplierReceiptCommand(state, {
      ...validReceiptCommand,
      authorization: "denied",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an unauthorized peer receipt to fail");
    }
    expect(result.error).toEqual({
      code: "peer-authorization-denied",
      peerInstallationId: "installation:manufacturer-001",
    });
    expect(state.currentPackage).toEqual({
      content: {
        children: [],
        epic: {
          description: "Previously published supplier package.",
          issueType: "Epic",
          key: "MFG-17",
          priority: "Medium",
          statusCategory: "In Progress",
          summary: "Previous package",
        },
      },
      correlationId: "corr-previous",
      pairedEpicId: "SUP-42",
      pairingId: "pairing-001",
      publishedAt: "2026-08-03T12:00:00.000Z",
      publisherId: "account:automation-001",
      sourceSiteId: "site:manufacturer-001",
      sourceEpicId: "MFG-17",
      version: "1",
    });
  });
});
