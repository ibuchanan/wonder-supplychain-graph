import { describe, expect, it } from "vitest";

import { buildBlueHandoff } from "../../src/pairing/blue-handoff";

const invitation = {
  correlationId: "correlation-001",
  greenBootstrapUrl: "https://green.webtrigger.atlassian.app/bootstrap",
} as const;

const approvedBlueOrigins = ["https://blue.example"] as const;

describe("buildBlueHandoff", () => {
  it("builds an allowlisted Blue navigation URL containing only setup correlation and Green bootstrap data", () => {
    expect(
      buildBlueHandoff(invitation, {
        approvedBlueOrigins,
        blueNavigationUrl: "https://blue.example/apps/join-peer-invitation",
      }),
    ).toEqual({
      kind: "external-navigation",
      url: "https://blue.example/apps/join-peer-invitation?bootstrapUrl=https%3A%2F%2Fgreen.webtrigger.atlassian.app%2Fbootstrap&correlation=correlation-001",
    });
  });

  it.each([
    [undefined, "the Blue navigation URL is unavailable"],
    [
      "https://unapproved.example/apps/join-peer-invitation",
      "the Blue origin is unapproved",
    ],
    ["http://blue.example/apps/join-peer-invitation", "the URL is not HTTPS"],
    [
      "https://blue.example/apps/join-peer-invitation?token=secret",
      "the URL includes configured query data",
    ],
  ])("returns a copyable manual bundle when %s", (blueNavigationUrl) => {
    expect(
      buildBlueHandoff(invitation, { approvedBlueOrigins, blueNavigationUrl }),
    ).toEqual({
      bundle: invitation,
      kind: "manual-copy",
    });
  });
});
