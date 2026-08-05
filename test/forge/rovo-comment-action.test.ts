import { describe, expect, it } from "vitest";

import { getManifestScopes, loadManifest } from "./manifest-helpers";

describe("Rovo originating Epic comment action", () => {
  it("wires the action to a Supplychain Graph Rovo agent with minimal inputs and Jira write scope", () => {
    const manifest = loadManifest();
    const modules = manifest.modules as Record<string, unknown>;

    expect(modules["rovo:agent"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actions: ["scg-comment-origin"],
          key: "scg-package-agent",
        }),
      ]),
    );
    expect(modules.action).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionVerb: "CREATE",
          function: "commentOnOriginEpic",
          inputs: {
            commentText: expect.objectContaining({
              required: true,
              type: "string",
            }),
          },
          key: "scg-comment-origin",
          name: "Comment on originating Epic",
        }),
      ]),
    );
    expect(getManifestScopes(manifest)).toContain("write:jira-work");
  });
});
