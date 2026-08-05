import { describe, expect, it } from "vitest";

import { loadManifest } from "./manifest-helpers";

describe("publish work package Automation Action", () => {
  it("exposes the publish action through Jira Automation with explicit runtime inputs", () => {
    const modules = loadManifest().modules as Record<string, unknown>;

    expect(modules["automation:actionProvider"]).toEqual([
      {
        actions: ["scg-publish-package", "scg-publish-package-graph"],
        key: "scg-publish-package-provider",
      },
    ]);
    expect(modules.action).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionVerb: "CREATE",
          function: "publishWorkPackage",
          inputs: {
            publisherId: expect.objectContaining({
              required: true,
              type: "string",
            }),
            sourceEpicId: expect.objectContaining({
              required: true,
              type: "string",
            }),
          },
          key: "scg-publish-package",
          name: "Publish work package",
        }),
      ]),
    );
  });
});
