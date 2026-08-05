import { kvs } from "@forge/kvs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T14:30:00.000Z"));
    vi.stubGlobal("crypto", { randomUUID: () => "execution-003" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("seeds a demo pairing and persists the queued candidate for a Source Epic", async () => {
    vi.mocked(kvs.get).mockResolvedValue(undefined);

    await expect(
      publishWorkPackage({
        publisherId: "account:automation-001",
        sourceEpicId: "MFG-17",
      }),
    ).resolves.toEqual({
      candidateId: "candidate:scg:MFG-17:execution-003",
      correlationId: "scg:execution-003",
      status: "queued",
    });

    expect(kvs.set).toHaveBeenCalledWith("demo-publication-state:MFG-17", {
      candidates: [
        {
          candidateId: "candidate:scg:MFG-17:execution-003",
          correlationId: "scg:execution-003",
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
      processedIdempotencyKeys: ["scg:MFG-17:execution-003"],
    });
  });
});
