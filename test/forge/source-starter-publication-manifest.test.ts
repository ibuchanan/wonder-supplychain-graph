import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

interface Manifest {
  readonly modules: {
    readonly webtrigger?: readonly {
      readonly function: string;
      readonly key: string;
    }[];
  };
  readonly permissions?: {
    readonly scopes?: readonly string[];
    readonly external?: {
      readonly fetch?: { readonly backend?: readonly string[] };
    };
  };
}

describe("source starter publication manifest", () => {
  it("exposes the source publication webtrigger with only the peer webtrigger egress domain", () => {
    const manifest = parse(readFileSync("manifest.yml", "utf8")) as Manifest;

    expect(manifest.modules.webtrigger).toContainEqual({
      function: "publishStarterDelivery",
      key: "scg-publish-starter",
    });
    expect(manifest.permissions?.external?.fetch?.backend).toContain(
      "*.webtrigger.atlassian.app",
    );
    expect(manifest.permissions?.scopes).toContain("read:jira-work");
  });
});
