import { describe, expect, it } from "vitest";

import { loadManifest } from "./manifest-helpers";

type ActionModule = {
  config?: { render?: string; resource?: string };
  key: string;
  resolver?: { function?: string };
};

describe("Automation Action configuration", () => {
  it("provides native configuration resources and resolver wiring for both publish actions", () => {
    const manifest =
      loadManifest() as typeof loadManifest extends () => infer Value
        ? Value & {
            modules: Value extends { modules: infer Modules }
              ? Modules & { action?: ActionModule[] }
              : never;
            resources?: Array<{ key: string; path: string }>;
          }
        : never;
    const actions = manifest.modules.action ?? [];

    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          config: { render: "native", resource: "publish-package-config" },
          key: "scg-publish-package",
          resolver: { function: "getActionConfig" },
        }),
        expect.objectContaining({
          config: { render: "native", resource: "publish-graph-config" },
          key: "scg-publish-package-graph",
          resolver: { function: "getActionConfig" },
        }),
      ]),
    );
    expect(manifest.resources).toEqual(
      expect.arrayContaining([
        {
          key: "publish-package-config",
          path: "src/frontend/publish-package-action-config.tsx",
        },
        {
          key: "publish-graph-config",
          path: "src/frontend/publish-graph-action-config.tsx",
        },
      ]),
    );
  });
});
