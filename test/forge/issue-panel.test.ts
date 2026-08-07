import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Supplychain Graph issue panel", () => {
  it("renders only the current tenant's local readiness", () => {
    const panelSource = readFileSync(
      join(process.cwd(), "src/frontend/index.tsx"),
      "utf8",
    );

    expect(panelSource).toContain(
      'invoke<{ status: LocalReadinessStatus }>("getLocalReadiness")',
    );
    expect(panelSource).toContain("Unconfigured.");
    expect(panelSource).toContain("Waiting for pairing.");
    expect(panelSource).toContain("Ready for starter publication or delivery.");
    expect(panelSource).toContain("Delivery failed.");
    expect(panelSource).not.toContain("toSupplierPackageView");
    expect(panelSource).not.toContain("peerDeliveryUrl");
    expect(panelSource).not.toContain("Current package");
  });
});
