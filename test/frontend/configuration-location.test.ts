import { describe, expect, it } from "vitest";

import { configurationLocation } from "../../src/frontend/configuration-location";

describe("Configuration page location", () => {
  it("addresses the configuration page by module key rather than by URL", () => {
    const location = configurationLocation("site-relationship");

    expect(location.moduleKey).toBe("scg-peer-invitations");
    expect(location.target).toBe("module");
  });

  it("carries the concern, so each empty state lands past the page's top", () => {
    const relationship = configurationLocation("site-relationship");
    const logSink = configurationLocation("log-sink");

    // The configuration page reads its arriving location's query string, so the
    // concern has to survive as a query parameter rather than as a bare path.
    expect(new URLSearchParams(relationship.path).get("setup")).toBe(
      "site-relationship",
    );
    expect(new URLSearchParams(logSink.path).get("setup")).toBe("log-sink");
  });
});
