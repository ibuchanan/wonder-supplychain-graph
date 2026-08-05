import { describe, expect, it } from "vitest";

import { loadManifest } from "./manifest-helpers";

interface NativeJiraPage {
  readonly key: string;
  readonly render: "native";
  readonly resource: string;
  readonly title: string;
}

describe("Supplychain Graph simulator page", () => {
  it("registers the development simulator as a native Jira global page", () => {
    const manifest = loadManifest() as {
      modules: { "jira:globalPage"?: readonly NativeJiraPage[] };
    };

    expect(manifest.modules["jira:globalPage"]).toContainEqual({
      key: "scg-simulator",
      render: "native",
      resource: "simulator",
      title: "Supplychain Graph Simulator",
    });
  });
});
