import type { Result } from "@forge-ahead/errors";
import { describe, expect, it } from "vitest";

import {
  publishDemoPackageToGraph,
  type DemoPackageGraphDependencies,
} from "../../src/projection/publish-demo-package-to-graph";
import type { PackageGraphPort } from "../../src/projection/ingest-package-projection";
import type { SupplierReceiptStateStore } from "../../src/projection/promote-demo-package";
import type { SupplierReceiptState } from "../../src/receipt/apply-command";

function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.isOk()).toBe(true);

  if (result.isErr()) {
    expect.unreachable(
      `Expected success, received ${JSON.stringify(result.error)}`,
    );
  }

  return result.value;
}

function dependencies(): DemoPackageGraphDependencies & {
  readonly graph: PackageGraphPort & { readonly set: unknown[] };
} {
  let state: SupplierReceiptState = {
    currentPackage: undefined,
    pairings: [],
    processedIdempotencyKeys: [],
  };
  const set: unknown[] = [];
  const store: SupplierReceiptStateStore = {
    async read() {
      return state;
    },
    async write(_connectionId, nextState) {
      state = nextState;
    },
  };
  const graph: PackageGraphPort & { readonly set: unknown[] } = {
    deleteObjectsByProperties: async () => ({ success: true }),
    set,
    setObjects: async (request) => {
      set.push(request);
      return { success: true };
    },
  };

  return { graph, store };
}

describe("publishDemoPackageToGraph", () => {
  it("promotes and indexes one current work package with Rovo-readable provenance", async () => {
    const { graph, store } = dependencies();

    const result = expectOk(
      await publishDemoPackageToGraph(
        { graph, store },
        {
          connectionId: "connection-001",
          correlationId: "corr-publish-001",
          idempotencyKey: "automation-run-001",
          publishedAt: "2026-08-05T12:00:00.000Z",
          publisherId: "account:automation-001",
          sourceEpicId: "MFG-17",
        },
      ),
    );

    expect(result).toEqual({
      ingested: 3,
      outcome: "indexed",
      sourceEpicId: "MFG-17",
      version: "1",
    });
    expect(graph.set).toHaveLength(1);

    const request = graph.set[0] as {
      objects: Array<{
        description: string;
        id: string;
        permissions: { accessControls: unknown[] };
      }>;
    };
    expect(request.objects.map((object) => object.id)).toEqual([
      "demo-pairing:MFG-17:MFG-17",
      "demo-pairing:MFG-17:MFG-17-scope",
      "demo-pairing:MFG-17:MFG-17-evidence",
    ]);
    expect(request.objects[0]?.description).toContain("Source Epic: MFG-17");
    expect(request.objects[0]?.description).toContain("Package version: 1");
    expect(request.objects[0]?.description).toContain(
      "Published: 2026-08-05T12:00:00.000Z",
    );
    expect(request.objects[0]?.permissions).toEqual({
      accessControls: [{ principals: [{ type: "EVERYONE" }] }],
    });
  });

  it("updates stable graph object IDs when the package is re-published", async () => {
    const { graph, store } = dependencies();
    const first = {
      connectionId: "connection-001",
      correlationId: "corr-publish-001",
      idempotencyKey: "automation-run-001",
      publishedAt: "2026-08-05T12:00:00.000Z",
      publisherId: "account:automation-001",
      sourceEpicId: "MFG-17",
    } as const;

    expectOk(await publishDemoPackageToGraph({ graph, store }, first));
    const replay = expectOk(
      await publishDemoPackageToGraph(
        { graph, store },
        {
          ...first,
          correlationId: "corr-publish-002",
          idempotencyKey: "automation-run-002",
          publishedAt: "2026-08-05T13:00:00.000Z",
        },
      ),
    );

    expect(replay).toMatchObject({
      outcome: "indexed",
      sourceEpicId: "MFG-17",
      version: "2",
    });
    expect(graph.set).toHaveLength(2);

    const firstRequest = graph.set[0] as {
      objects: Array<{ id: string; updateSequenceNumber: number }>;
    };
    const secondRequest = graph.set[1] as {
      objects: Array<{ id: string; updateSequenceNumber: number }>;
    };
    expect(secondRequest.objects.map((object) => object.id)).toEqual(
      firstRequest.objects.map((object) => object.id),
    );
    expect(
      secondRequest.objects.map((object) => object.updateSequenceNumber),
    ).toEqual([2, 2, 2]);
  });
});
