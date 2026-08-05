import { describe, expect, it } from "vitest";

import {
  createDemoPublishWorkPackageAction,
  type PublicationStateStore,
} from "../../src/publication/automation-action";
import type { PublicationState } from "../../src/publication/apply-command";

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
});
