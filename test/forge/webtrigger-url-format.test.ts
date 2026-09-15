import { describe, expect, it } from "vitest";

import { loadManifest } from "./manifest-helpers";

describe("peer webtriggers", () => {
  it("uses the v2 installation-based URL format for every public endpoint", () => {
    const modules = loadManifest().modules as {
      readonly webtrigger?: readonly {
        readonly key: string;
        readonly urlFormat?: string;
      }[];
    };

    expect(modules.webtrigger?.map(({ key }) => key)).toEqual([
      "scg-receive-peer-event",
      "scg-receive-bootstrap-request",
    ]);
    expect(modules.webtrigger).toEqual(
      modules.webtrigger?.map(() =>
        expect.objectContaining({ urlFormat: "v2" }),
      ),
    );
  });
});
