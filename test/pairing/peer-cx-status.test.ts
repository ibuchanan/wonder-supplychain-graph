import { describe, expect, it } from "vitest";

import { derivePeerCxStatus } from "../../src/pairing/peer-cx-status";

const agreement = {
  counterpartSiteAri: "ari:cloud:jira::site/green-site",
  leaseEndsAt: "2026-10-01T00:00:00.000Z",
  peerCxId: "peer-cx-001",
  status: "active",
  termsVersion: "v1",
} as const;

describe("derivePeerCxStatus", () => {
  it("reports active for a recorded agreement inside its lease", () => {
    expect(
      derivePeerCxStatus({
        agreement,
        now: "2026-09-16T00:00:00.000Z",
      }),
    ).toBe("active");
  });

  it("reports expired once the lease has passed, though nothing was written", () => {
    expect(
      derivePeerCxStatus({
        agreement,
        now: "2026-10-01T00:00:00.001Z",
      }),
    ).toBe("expired");
  });

  it("reports revoked ahead of the lease, because revocation is the decision", () => {
    expect(
      derivePeerCxStatus({
        agreement: { ...agreement, status: "revoked" },
        // Inside the lease, so only the revocation can produce this answer.
        now: "2026-09-16T00:00:00.000Z",
      }),
    ).toBe("revoked");
  });

  it.each([
    ["awaiting-green-approval", "proposed"],
    ["awaiting-blue-confirmation", "confirming"],
    ["rejected", "declined"],
    ["invalidated", "invalidated"],
    // A confirmed nomination with no agreement written yet must not be
    // reported as active: the agreement record is what authorizes exchange.
    ["active", "confirming"],
  ] as const)(
    "reports a nomination in %s as %s while no agreement is recorded",
    (nominationStatus, expected) => {
      expect(
        derivePeerCxStatus({
          nomination: { status: nominationStatus },
          now: "2026-09-16T00:00:00.000Z",
        }),
      ).toBe(expected);
    },
  );

  it("reports invited when only an invitation has been issued", () => {
    expect(
      derivePeerCxStatus({
        invitation: { expiresAt: "2026-09-23T00:00:00.000Z" },
        now: "2026-09-16T00:00:00.000Z",
      }),
    ).toBe("invited");
  });

  it("reports nothing at all when no record names this counterpart", () => {
    // There is no PeerCX to describe, which is different from one in a state
    // the administrator should be shown.
    expect(derivePeerCxStatus({ now: "2026-09-16T00:00:00.000Z" })).toBe(
      undefined,
    );
  });

  it("prefers the agreement, then the nomination, then the invitation", () => {
    const setup = {
      invitation: { expiresAt: "2026-09-23T00:00:00.000Z" },
      nomination: { status: "awaiting-green-approval" },
      now: "2026-09-16T00:00:00.000Z",
    } as const;

    // Each record supersedes the ones it grew out of, so the latest stage wins
    // rather than the earliest one still on file.
    expect(derivePeerCxStatus({ ...setup, agreement })).toBe("active");
    expect(derivePeerCxStatus(setup)).toBe("proposed");
  });
});
