import { describe, expect, it } from "vitest";

import { createInvitation } from "../../src/pairing/invitation-workflow";
import { readInvitationUrl } from "../../src/pairing/read-invitation-url";

const invitation = createInvitation(
  { invitations: [] },
  {
    allowedOperations: ["starter.delivery"],
    createdAt: "2026-09-14T12:00:00.000Z",
    greenNavigationUrl: "https://green.example/invitations",
    purpose: "Coordinate supplier delivery",
    recipientAccountId: "tina-green-account",
    termsVersion: "v1",
  },
  {
    randomUUID: (() => {
      const ids = ["invitation-001", "correlation-001", "reference-001"];
      let index = 0;
      return () => ids[index++] ?? "unexpected";
    })(),
  },
);

describe("readInvitationUrl", () => {
  it("resolves the opaque invitation reference only for its named recipient without mutating state", () => {
    const result = readInvitationUrl(
      invitation.nextState,
      "https://green.example/invitations?invitation=reference-001",
      "tina-green-account",
      "2026-09-15T12:00:00.000Z",
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected the named recipient to read the invitation");
    }
    expect(result.value).toEqual({
      allowedOperations: ["starter.delivery"],
      correlationId: "correlation-001",
      expiresAt: "2026-09-21T12:00:00.000Z",
      purpose: "Coordinate supplier delivery",
      termsVersion: "v1",
    });
    expect(invitation.nextState).toEqual({
      invitations: [invitation.invitation],
    });
  });

  it("returns a typed safe error for a malformed invitation URL", () => {
    const result = readInvitationUrl(
      invitation.nextState,
      "not a URL",
      "tina-green-account",
      "2026-09-15T12:00:00.000Z",
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected a malformed invitation URL to fail");
    }
    expect(result.error).toEqual({ code: "invitation-reference-missing" });
  });

  it("returns a typed safe error when the URL does not contain an invitation reference", () => {
    const result = readInvitationUrl(
      invitation.nextState,
      "https://green.example/invitations",
      "tina-green-account",
      "2026-09-15T12:00:00.000Z",
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable(
        "Expected a URL without an invitation reference to fail",
      );
    }
    expect(result.error).toEqual({ code: "invitation-reference-missing" });
  });
});
