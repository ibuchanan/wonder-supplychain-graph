import { describe, expect, it } from "vitest";

import { loadManifest } from "./manifest-helpers";

describe("peer event webtrigger", () => {
  it("uses the v2 installation-based URL format for its only public endpoint", () => {
    const modules = loadManifest().modules as {
      readonly webtrigger?: readonly {
        readonly key: string;
        readonly urlFormat?: string;
      }[];
    };

    expect(modules.webtrigger).toEqual([
      expect.objectContaining({
        key: "scg-receive-peer-event",
        urlFormat: "v2",
      }),
    ]);
  });
});
