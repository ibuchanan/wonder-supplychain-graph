import { describe, expect, it } from "vitest";

import { loadManifest } from "./manifest-helpers";

describe("Rovo demo graph discovery Automation Action", () => {
  it("exposes a publish-and-index action with graph connection inputs", () => {
    const modules = loadManifest().modules as Record<string, unknown>;

    expect(modules.action).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionVerb: "CREATE",
          function: "publishPackageToGraph",
          inputs: {
            connectionId: expect.objectContaining({
              required: true,
              type: "string",
            }),
            correlationId: expect.objectContaining({
              required: true,
              type: "string",
            }),
            idempotencyKey: expect.objectContaining({
              required: true,
              type: "string",
            }),
            publishedAt: expect.objectContaining({
              required: true,
              type: "string",
            }),
            publisherId: expect.objectContaining({
              required: true,
              type: "string",
            }),
            sourceEpicId: expect.objectContaining({
              required: true,
              type: "string",
            }),
          },
          key: "scg-publish-package-graph",
          name: "Publish package to Rovo demo",
        }),
      ]),
    );
  });
});
