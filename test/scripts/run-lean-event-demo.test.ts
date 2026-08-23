import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const script = readFileSync("scripts/run-lean-event-demo.cjs", "utf8");

describe("run-lean-event-demo", () => {
  it("runs the safe local POC harness without printing capability URLs", () => {
    expect(script).toContain("readLeanEventDemoConfig");
    expect(script).toContain("runLeanEventDemo");
    expect(script).not.toContain("console.log(config.value");
  });
});
