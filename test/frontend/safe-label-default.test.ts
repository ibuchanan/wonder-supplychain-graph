import { describe, expect, it } from "vitest";

import { defaultSafeLabel } from "../../src/frontend/safe-label-default";

describe("Default UI safe label", () => {
  it("names a connection rather than either site", () => {
    // The first word of each list, so the assertion reads as the documented
    // pattern instead of as a restatement of the implementation.
    expect(defaultSafeLabel(() => 0)).toBe("brisk-bridge");
  });

  it("builds an adjective and a connection noun, whatever it picks", () => {
    for (let index = 0; index < 8; index += 1) {
      expect(defaultSafeLabel(() => index)).toMatch(
        /^[a-z]+-(bridge|channel|circuit|conduit|connection|crossing|link|relay)$/,
      );
    }
  });

  it("stays within the word lists it is given", () => {
    // A default that ran off the end of a list would read as "undefined-link"
    // in the peer administrator's UI, which is exactly what the safe label
    // exists to avoid.
    const labels = new Set<string>();

    for (let index = 0; index < 64; index += 1) {
      labels.add(defaultSafeLabel());
    }

    for (const label of labels) {
      expect(label).not.toContain("undefined");
    }
  });
});
