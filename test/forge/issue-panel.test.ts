import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Supplychain Graph issue panel", () => {
  it("shows the current authorized package on a supplier Paired Epic", () => {
    const panelSource = readFileSync(
      join(process.cwd(), "src/frontend/index.tsx"),
      "utf8",
    );

    expect(panelSource).toContain("toSupplierPackageView");
    expect(panelSource).toContain("Current package");
    expect(panelSource).toContain("Source Epic:");
    expect(panelSource).toContain("Source site:");
    expect(panelSource).toContain("Publisher:");
    expect(panelSource).toContain("Published:");
    expect(panelSource).toContain("Direct children");
  });
});
