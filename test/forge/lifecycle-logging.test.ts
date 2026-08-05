import { describe, expect, it } from "vitest";

import { loadManifest } from "./manifest-helpers";

describe("lifecycle logging manifest", () => {
  it("subscribes logging-only handlers to app installation and major upgrade events", () => {
    const manifest = loadManifest() as {
      modules: Record<string, unknown>;
    };

    expect(manifest.modules.trigger).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          events: ["avi:forge:installed:app"],
          function: "onInstalled",
          key: "scg-on-installed",
        }),
        expect.objectContaining({
          events: ["avi:forge:upgraded:app"],
          function: "onUpgraded",
          key: "scg-on-upgraded",
        }),
      ]),
    );
  });
});
