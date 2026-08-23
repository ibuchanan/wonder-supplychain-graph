import { describe, expect, it } from "vitest";

import { loadManifest } from "./manifest-helpers";

describe("lean event receiver Forge wiring", () => {
  it("declares the dynamic receiver and Jira Automation backend egress", () => {
    const manifest = loadManifest();
    const modules = manifest.modules as {
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
    const external = manifest.permissions?.external as {
      readonly fetch?: {
        readonly backend?: readonly { readonly address: string }[];
      };
    };

    expect(modules.function).toEqual(
      expect.arrayContaining([
        { handler: "index.receiveLeanEvent", key: "receiveLeanEvent" },
      ]),
    );
    expect(modules.webtrigger).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          function: "receiveLeanEvent",
          key: "scg-receive-lean-event",
          response: { type: "dynamic" },
          urlFormat: "v2",
        }),
      ]),
    );
    expect(external.fetch?.backend).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ address: "automation.atlassian.com" }),
      ]),
    );
  });
});
