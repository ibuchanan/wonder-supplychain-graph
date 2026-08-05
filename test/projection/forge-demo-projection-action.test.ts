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
  const storedValues = new Map<string, unknown>();

  beforeEach(() => {
    vi.resetAllMocks();
    storedValues.clear();
    storedValues.set("active-graph-connection-id", "connection-001");
    vi.mocked(kvs.get).mockImplementation(
      async (key) => storedValues.get(key) as never,
    );
    vi.mocked(kvs.set).mockImplementation(async (key, value) => {
      storedValues.set(key, value);
    });
    vi.mocked(graph.setObjects).mockResolvedValue({ success: true });
  });

  it("returns an Automation-visible indexed result after persisting and projecting the current package", async () => {
    await expect(
      publishPackageToGraph({
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

  it("returns no-active-connection without writing or indexing when the app has no active graph connection", async () => {
    storedValues.clear();

    await expect(
      publishPackageToGraph({
        publisherId: "account:automation-001",
        sourceEpicId: "MFG-17",
      }),
    ).resolves.toEqual({
      reason: "no-active-connection",
      sourceEpicId: "MFG-17",
      status: "failed",
    });

    expect(kvs.set).not.toHaveBeenCalled();
    expect(graph.setObjects).not.toHaveBeenCalled();
  });
});
