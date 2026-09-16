import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * What the status page is allowed to say. Its manifest wiring is covered
 * generically by frontend-to-manifest.test.ts, so what is left here is the part
 * no type or schema can enforce: a screen is permanent disclosure, so a secret
 * must not be able to reach one, and the page must not overstate what it knows.
 */
function loadSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Status page disclosure", () => {
  it("puts no secret on a screen", () => {
    expect(loadSource("src/frontend/status.tsx")).not.toContain(
      "SHARED_SECRET",
    );
    expect(loadSource("src/frontend/status-page.tsx")).not.toContain(
      "SHARED_SECRET",
    );
  });

  it("claims only local readiness, because it has no way to observe a peer", () => {
    expect(loadSource("src/frontend/status-page.tsx")).toContain(
      "This reports only local POC readiness.",
    );
  });
});
