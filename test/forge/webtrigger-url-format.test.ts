import { describe, expect, it } from "vitest";

import { loadManifest } from "./manifest-helpers";

describe("starter delivery webtriggers", () => {
  it("uses the v2 installation-based URL format for every endpoint", () => {
    const modules = loadManifest().modules as {
      readonly webtrigger?: readonly {
        readonly key: string;
        readonly urlFormat?: string;
      }[];
    };

    expect(modules.webtrigger).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "scg-seed-source", urlFormat: "v2" }),
        expect.objectContaining({
          key: "scg-seed-destination",
          urlFormat: "v2",
        }),
        expect.objectContaining({
          key: "scg-receive-starter",
          urlFormat: "v2",
        }),
        expect.objectContaining({
          key: "scg-publish-starter",
          urlFormat: "v2",
        }),
      ]),
    );
  });
});
