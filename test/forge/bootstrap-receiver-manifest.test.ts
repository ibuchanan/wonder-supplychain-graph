import { describe, expect, it } from "vitest";

import { loadManifest } from "./manifest-helpers";

describe("site relationship bootstrap Forge wiring", () => {
  it("declares a dedicated dynamic bootstrap route separate from the operational receiver", () => {
    const modules = loadManifest().modules as {
      readonly function?: readonly {
        readonly handler: string;
        readonly key: string;
      }[];
      readonly webtrigger?: readonly {
        readonly function: string;
        readonly key: string;
        readonly response?: { readonly type?: string };
        readonly urlFormat?: string;
      }[];
    };

    expect(modules.function).toEqual(
      expect.arrayContaining([
        {
          handler: "index.receiveBootstrapRequest",
          key: "receiveBootstrapRequest",
        },
      ]),
    );
    expect(modules.webtrigger).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          function: "receiveBootstrapRequest",
          key: "scg-receive-bootstrap-request",
          response: { type: "dynamic" },
          urlFormat: "v2",
        }),
      ]),
    );
  });
});
