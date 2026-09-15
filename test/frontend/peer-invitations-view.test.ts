import { describe, expect, it } from "vitest";

import { chooseInvitationView } from "../../src/frontend/peer-invitations-view";

describe("chooseInvitationView", () => {
  it("shows the recipient view for a host page reached from an invitation reference", () => {
    const view = chooseInvitationView(
      "https://example.atlassian.net/jira/settings/apps/scg/peer-invitations?invitation=ref-7",
    );

    expect(view).toEqual({ kind: "recipient", reference: "ref-7" });
  });

  it("shows the configuration page when an administrator arrives without a reference", () => {
    const view = chooseInvitationView(
      "https://example.atlassian.net/jira/settings/apps/scg/peer-invitations",
    );

    expect(view).toEqual({ kind: "configuration" });
  });

  it("falls back to the configuration page when the host page URL is unreadable", () => {
    expect(chooseInvitationView(undefined)).toEqual({ kind: "configuration" });
    expect(chooseInvitationView("not-a-url")).toEqual({
      kind: "configuration",
    });
  });
});
