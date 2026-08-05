import { kvs } from "@forge/kvs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@forge/kvs", () => ({
  kvs: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

import { publishWorkPackage } from "../../src/publication/forge-automation-action";

describe("publishWorkPackage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("seeds a demo pairing and persists the queued candidate for a Source Epic", async () => {
    vi.mocked(kvs.get).mockResolvedValue(undefined);

    await expect(
      publishWorkPackage({
        correlationId: "corr-publish-003",
        idempotencyKey: "automation-run-003",
        publisherId: "account:automation-001",
        sourceEpicId: "MFG-17",
      }),
    ).resolves.toEqual({
      candidateId: "candidate:automation-run-003",
      correlationId: "corr-publish-003",
      status: "queued",
    });

    expect(kvs.set).toHaveBeenCalledWith("demo-publication-state:MFG-17", {
      candidates: [
        {
          candidateId: "candidate:automation-run-003",
          correlationId: "corr-publish-003",
          pairedEpicId: "demo-paired:MFG-17",
          pairingId: "demo-pairing:MFG-17",
          publisherId: "account:automation-001",
          sourceEpicId: "MFG-17",
          state: "queued",
        },
      ],
      pairings: [
        {
          automationConnectionUserId: "account:automation-001",
          pairedEpicId: "demo-paired:MFG-17",
          pairingId: "demo-pairing:MFG-17",
          sourceEpicId: "MFG-17",
          status: "active",
        },
      ],
      processedIdempotencyKeys: ["automation-run-003"],
    });
  });
});
