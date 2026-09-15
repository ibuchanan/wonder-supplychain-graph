import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function loadPageSource() {
  return readFileSync(
    join(process.cwd(), "src/frontend/peer-invitations.tsx"),
    "utf8",
  );
}

describe("CloudEvent log sink section of the configuration page", () => {
  it("carries the sink target, secret, and auth method as one section of the configuration page", () => {
    const page = loadPageSource();

    expect(page).toContain("Event log sink");
    expect(page).toContain("Sink target URL");
    expect(page).toContain("Bearer Token");
    expect(page).toContain("CloudEvents HTTP Webhook Specification");
  });

  it("reads and writes the sink through the app-wide resolvers", () => {
    const page = loadPageSource();

    expect(page).toContain('"getLogSink"');
    expect(page).toContain('"saveLogSink"');
    expect(page).toContain('"resetLogSink"');
  });

  it("reports whether a sink and a secret are on record without a field that could render one back", () => {
    const page = loadPageSource();

    expect(page).toContain("hasSecret");
    expect(page).toContain("isConfigured");
    // The status the resolver returns has no secret in it, so nothing in the
    // page may read one out of a saved sink.
    expect(page).not.toMatch(/status\??\.secret/);
    expect(page).not.toMatch(/sink\??\.secret/);
  });

  it("shows the administrator why a sink was refused, using the resolver's safe reason", () => {
    const page = loadPageSource();

    expect(page).toContain('"rejected"');
    expect(page).toContain("log-sink-host-not-permitted");
    expect(page).toContain("webhook-origin-not-allowed");
    expect(page).toContain("does not allow this site as its event origin");
  });
});
