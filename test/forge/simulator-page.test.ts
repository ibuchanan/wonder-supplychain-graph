import { readFileSync } from "node:fs";
import { join } from "node:path";

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

  it("lets a developer run the deterministic delivery and inspect replay plus audit evidence", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "src/frontend/simulator.tsx"),
      "utf8",
    );

    expect(pageSource).toContain("applyDeterministicSupplierReceipt");
    expect(pageSource).toContain("Deliver deterministic package");
    expect(pageSource).toContain("Latest delivery");
    expect(pageSource).toContain("Audit evidence");
    expect(pageSource).toContain("Select deterministic scenario");
    expect(pageSource).toContain("Show empty state");
    expect(pageSource).toContain("Show pending candidate");
    expect(pageSource).toContain("Show authorization denied");
    expect(pageSource).toContain("Show malformed candidate");
    expect(pageSource).toContain("Show unavailable relationship");
  });
});
