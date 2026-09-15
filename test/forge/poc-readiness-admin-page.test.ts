import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadManifest } from "./manifest-helpers";

describe("Peer POC readiness admin page", () => {
  it("provides an administrator-only page backed by the local POC readiness resolver", () => {
    const manifest = loadManifest();
    const page = manifest.modules["jira:adminPage"]?.find(
      (entry: { key: string }) => entry.key === "scg-poc-readiness",
    );
    const frontend = readFileSync(
      join(process.cwd(), "src/frontend/poc-readiness.tsx"),
      "utf8",
    );
    const resolvers = readFileSync(
      join(process.cwd(), "src/resolvers/index.ts"),
      "utf8",
    );

    expect(page).toMatchObject({
      render: "native",
      resolver: { function: "getActionConfig" },
      resource: "poc-readiness",
      title: "Supplychain Graph Peer POC readiness",
    });
    expect(resolvers).toContain('resolver.define("getPocReadiness"');
    expect(frontend).toContain('invoke<PocReadiness>("getPocReadiness")');
    expect(frontend).toContain("This reports only local POC readiness.");
    expect(frontend).not.toContain("SHARED_SECRET");
  });
});
