import { graph } from "@forge/teamwork-graph";
import { kvs } from "@forge/kvs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@forge/kvs", () => ({
  kvs: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("@forge/teamwork-graph", () => ({
  graph: {
    deleteObjectsByProperties: vi.fn(),
    setObjects: vi.fn(),
  },
}));

import { publishPackageToGraph } from "../../src/projection/forge-demo-projection-action";

describe("publishPackageToGraph", () => {
  let storedState: unknown;

  beforeEach(() => {
    vi.resetAllMocks();
    storedState = undefined;
    vi.mocked(kvs.get).mockImplementation(async () => storedState as never);
    vi.mocked(kvs.set).mockImplementation(async (_key, value) => {
      storedState = value;
    });
    vi.mocked(graph.setObjects).mockResolvedValue({ success: true });
  });

  it("returns an Automation-visible indexed result after persisting and projecting the current package", async () => {
    await expect(
      publishPackageToGraph({
        connectionId: "connection-001",
        correlationId: "corr-publish-001",
        idempotencyKey: "automation-run-001",
        publishedAt: "2026-08-05T12:00:00.000Z",
        publisherId: "account:automation-001",
        sourceEpicId: "MFG-17",
      }),
    ).resolves.toEqual({
      ingested: 3,
      sourceEpicId: "MFG-17",
      status: "indexed",
      version: "1",
    });

    expect(kvs.set).toHaveBeenCalledOnce();
    expect(graph.setObjects).toHaveBeenCalledOnce();
  });
});
