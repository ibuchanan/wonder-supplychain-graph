import { describe, expect, it } from "vitest";

import { evaluatePeerCxAuthorization } from "../../src/pairing/peer-cx";

describe("evaluatePeerCxAuthorization", () => {
  it("authorizes a pairing only for its active PeerCX and current lease", () => {
    expect(
      evaluatePeerCxAuthorization(
        {
          counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
          leaseEndsAt: "2026-09-15T00:00:00.000Z",
          peerCxId: "peer-cx-001",
          status: "active",
          termsVersion: "v1",
        },
        {
          counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
          now: "2026-09-14T18:00:00.000Z",
          peerCxId: "peer-cx-001",
        },
      ),
    ).toEqual({ authorized: true });
  });

  it.each([
    [undefined, "no PeerCX exists"],
    [
      {
        counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
        leaseEndsAt: "2026-09-15T00:00:00.000Z",
        peerCxId: "peer-cx-001",
        status: "pending",
        termsVersion: "v1",
      },
      "the PeerCX is pending",
    ],
    [
      {
        counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
        leaseEndsAt: "2026-09-15T00:00:00.000Z",
        peerCxId: "peer-cx-001",
        status: "revoked",
        termsVersion: "v1",
      },
      "the PeerCX is revoked",
    ],
    [
      {
        counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
        leaseEndsAt: "2026-09-15T00:00:00.000Z",
        peerCxId: "peer-cx-001",
        status: "expired",
        termsVersion: "v1",
      },
      "the PeerCX is expired",
    ],
    [
      {
        counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
        leaseEndsAt: "2026-09-15T00:00:00.000Z",
        peerCxId: "peer-cx-001",
        status: "failed",
        termsVersion: "v1",
      },
      "the PeerCX setup failed",
    ],
    [
      {
        counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
        leaseEndsAt: "2026-09-14T18:00:00.000Z",
        peerCxId: "peer-cx-001",
        status: "active",
        termsVersion: "v1",
      },
      "the lease has ended",
    ],
    [
      {
        counterpartSiteAri: "ari:cloud:jira::site/other-supplier-001",
        leaseEndsAt: "2026-09-15T00:00:00.000Z",
        peerCxId: "peer-cx-001",
        status: "active",
        termsVersion: "v1",
      },
      "the nominated counterpart differs",
    ],
    [
      {
        counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
        leaseEndsAt: "2026-09-15T00:00:00.000Z",
        peerCxId: "peer-cx-002",
        status: "active",
        termsVersion: "v1",
      },
      "the PeerCX differs",
    ],
  ] as const)("denies authorization when %s", (peerCx) => {
    expect(
      evaluatePeerCxAuthorization(peerCx, {
        counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
        now: "2026-09-14T18:00:00.000Z",
        peerCxId: "peer-cx-001",
      }),
    ).toEqual({ authorized: false });
  });

  it("denies authorization when the lease timestamp is malformed", () => {
    expect(
      evaluatePeerCxAuthorization(
        {
          counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
          leaseEndsAt: "not-a-timestamp",
          peerCxId: "peer-cx-001",
          status: "active",
          termsVersion: "v1",
        },
        {
          counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
          now: "2026-09-14T18:00:00.000Z",
          peerCxId: "peer-cx-001",
        },
      ),
    ).toEqual({ authorized: false });
  });
});
