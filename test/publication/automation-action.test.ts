import { afterEach, describe, expect, it, vi } from "vitest";
import type { SourcePeerPairing } from "../../src/pairing/peer-pairing-state";
import type { PublicationState } from "../../src/publication/apply-command";
import {
  createDemoPublishWorkPackageAction,
  type PublicationStateStore,
} from "../../src/publication/automation-action";

function activePublicationState(): PublicationState {
  return {
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
  };
}

describe("createDemoPublishWorkPackageAction", () => {
  it("queues an authorized Source Epic publication and returns Automation-visible provenance", async () => {
    const writes: PublicationState[] = [];
    const store: PublicationStateStore = {
      async load() {
        return activePublicationState();
      },
      async save(_sourceEpicId, state) {
        writes.push(state);
      },
    };
    const publishWorkPackage = createDemoPublishWorkPackageAction({ store });

    await expect(
      publishWorkPackage({
        correlationId: "corr-publish-001",
        idempotencyKey: "automation-run-001",
        publisherId: "account:automation-001",
        sourceEpicId: "MFG-17",
      }),
    ).resolves.toEqual({
      candidateId: "candidate:automation-run-001",
      correlationId: "corr-publish-001",
      status: "queued",
    });

    expect(writes).toEqual([
      {
        candidates: [
          {
            candidateId: "candidate:automation-run-001",
            correlationId: "corr-publish-001",
            pairedEpicId: "SUP-42",
            pairingId: "pairing-001",
            publisherId: "account:automation-001",
            sourceEpicId: "MFG-17",
            state: "queued",
          },
        ],
        pairings: activePublicationState().pairings,
        processedIdempotencyKeys: ["automation-run-001"],
      },
    ]);
  });

  it("does not persist a duplicate candidate when Automation replays the same run", async () => {
    let state = activePublicationState();
    const writes: PublicationState[] = [];
    const store: PublicationStateStore = {
      async load() {
        return state;
      },
      async save(_sourceEpicId, nextState) {
        state = nextState;
        writes.push(nextState);
      },
    };
    const publishWorkPackage = createDemoPublishWorkPackageAction({ store });
    const payload = {
      correlationId: "corr-publish-004",
      idempotencyKey: "automation-run-004",
      publisherId: "account:automation-001",
      sourceEpicId: "MFG-17",
    } as const;

    await expect(publishWorkPackage(payload)).resolves.toEqual({
      candidateId: "candidate:automation-run-004",
      correlationId: "corr-publish-004",
      status: "queued",
    });
    await expect(publishWorkPackage(payload)).resolves.toEqual({
      candidateId: "candidate:automation-run-004",
      correlationId: "corr-publish-004",
      status: "queued",
    });

    expect(writes).toHaveLength(1);
    expect(state.candidates).toHaveLength(1);
  });

  it("returns a visible preflight failure without saving when the Source Epic has no pairing", async () => {
    const writes: PublicationState[] = [];
    const store: PublicationStateStore = {
      async load() {
        return {
          candidates: [],
          pairings: [],
          processedIdempotencyKeys: [],
        };
      },
      async save(_sourceEpicId, state) {
        writes.push(state);
      },
    };
    const publishWorkPackage = createDemoPublishWorkPackageAction({ store });

    await expect(
      publishWorkPackage({
        correlationId: "corr-publish-002",
        idempotencyKey: "automation-run-002",
        publisherId: "account:automation-001",
        sourceEpicId: "MFG-17",
      }),
    ).resolves.toEqual({
      candidateId: "candidate:automation-run-002",
      correlationId: "corr-publish-002",
      reason: "invalid-publication-pairing",
      status: "preflight-failed",
    });

    expect(writes).toEqual([]);
  });

  it("emits one identifier-only lean event after queueing through its active source pairing", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T14:30:00.000Z"));
    vi.stubGlobal("crypto", { randomUUID: () => "event-001" });
    const emitLeanEvent = vi.fn().mockResolvedValue(undefined);
    const sourcePairing: SourcePeerPairing = {
      allowedOperations: ["starter.delivery"],
      relationshipId: "relationship-001",
      pairingId: "pairing-001",
      peerEventUrl: "https://green.example/forge/webtrigger/receive-peer-event",
      role: "source",
      sourceEpicKey: "MFG-17",
      sourceSiteAri: "ari:cloud:jira::site/blue-site",
      sourceSiteUrl: "https://blue.example",
      status: "active",
    };
    const publishWorkPackage = createDemoPublishWorkPackageAction({
      emitLeanEvent,
      resolveSourcePairing: async () => sourcePairing,
      store: {
        load: async () => activePublicationState(),
        save: async () => undefined,
      },
    });

    await publishWorkPackage({
      correlationId: "corr-publish-005",
      idempotencyKey: "automation-run-005",
      publisherId: "account:automation-001",
      sourceEpicId: "MFG-17",
    });

    expect(emitLeanEvent).toHaveBeenCalledExactlyOnceWith(
      sourcePairing,
      {
        data: {
          issueKey: "MFG-17",
          pairingId: "pairing-001",
          updatedFields: [],
        },
        datacontenttype: "application/json",
        id: "event-001",
        source: "ari:cloud:jira::site/blue-site",
        specversion: "1.0",
        subject: "issue/MFG-17",
        time: "2026-08-22T14:30:00.000Z",
        type: "scg:work-package:queued",
      },
      // The business operation's own key, kept out of the event body.
      "automation-run-005",
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
