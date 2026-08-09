import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const script = readFileSync("scripts/run-starter-delivery-harness.cjs", "utf8");

describe("run-starter-delivery-harness", () => {
  it("prints a destination-scoped federated document search command without executing it", () => {
    expect(script).toContain("function shellQuote(value)");
    expect(script).toContain('"twg docs search"');
    expect(script).toContain("destinationSearchCommand");
    expect(script).toContain("config.value.destinationSite");
  });
});
