import { describe, expect, it } from "vitest";

import { authorizePeerRoute } from "../../src/collaboration/peer-route-authorization";
import type { PeerCx } from "../../src/pairing/peer-cx";
import type { DestinationPeerPairing } from "../../src/pairing/peer-pairing-state";

const now = "2026-09-15T12:00:00.000Z";

const peerCx: PeerCx = {
  counterpartSiteAri: "ari:cloud:jira::site/blue-site",
  leaseEndsAt: "2027-09-15T12:00:00.000Z",
  peerCxId: "peer-cx-001",
  status: "active",
  termsVersion: "v1",
};

const pairing: DestinationPeerPairing = {
  allowedOperations: ["starter.delivery"],
  automationWebhookUrl: "https://automation.example/webhook",
  graphCxId: "graph-cx-001",
  pairedEpicKey: "BLUE-1",
  pairingId: "pairing-001",
  peerCxId: "peer-cx-001",
  role: "destination",
  sourceEpicKey: "GREEN-1",
  status: "active",
};

const request = {
  counterpartSiteAri: peerCx.counterpartSiteAri,
  now,
  operation: "starter.delivery",
  pairingId: "pairing-001",
  peerCxId: "peer-cx-001",
  role: "destination",
  sourceEpicKey: "GREEN-1",
} as const;

describe("authorizePeerRoute", () => {
  it("authorizes the exact active pairing under an in-lease PeerCX", () => {
    const authorized = authorizePeerRoute([peerCx], [pairing], request);

    expect(authorized.isOk() && authorized.value.pairing).toBe(pairing);
  });

  it("denies a secret holder with no matching local PeerCX", () => {
    // A third installation sharing the development environment secret can
    // produce a valid signature. Possession is not a PeerCX.
    expect(authorizePeerRoute([], [pairing], request)).toMatchObject({
      error: { code: "peer-cx-unauthorized" },
    });
  });

  it("denies a revoked or expired PeerCX even with an active pairing", () => {
    for (const status of ["revoked", "expired", "pending", "failed"] as const) {
      expect(
        authorizePeerRoute([{ ...peerCx, status }], [pairing], request),
      ).toMatchObject({ error: { code: "peer-cx-unauthorized" } });
    }

    expect(
      authorizePeerRoute(
        [{ ...peerCx, leaseEndsAt: "2026-09-15T11:59:59.999Z" }],
        [pairing],
        request,
      ),
    ).toMatchObject({ error: { code: "peer-cx-unauthorized" } });
  });

  it("denies a counterpart or PeerCX the request does not actually name", () => {
    expect(
      authorizePeerRoute([peerCx], [pairing], {
        ...request,
        counterpartSiteAri: "ari:cloud:jira::site/other-site",
      }),
    ).toMatchObject({ error: { code: "peer-cx-unauthorized" } });
    expect(
      authorizePeerRoute([peerCx], [pairing], {
        ...request,
        peerCxId: "peer-cx-002",
      }),
    ).toMatchObject({ error: { code: "peer-cx-unauthorized" } });
  });

  it("denies a pairing that is inactive, unknown, or under another PeerCX", () => {
    // An active PeerCX is reusable across Pairings, so it cannot carry
    // authority for a Pairing that was never authorized under it.
    expect(
      authorizePeerRoute(
        [peerCx],
        [{ ...pairing, status: "inactive" }],
        request,
      ),
    ).toMatchObject({ error: { code: "pairing-unauthorized" } });
    expect(authorizePeerRoute([peerCx], [], request)).toMatchObject({
      error: { code: "pairing-unauthorized" },
    });
    expect(
      authorizePeerRoute(
        [peerCx],
        [{ ...pairing, peerCxId: "peer-cx-002" }],
        request,
      ),
    ).toMatchObject({ error: { code: "pairing-unauthorized" } });
  });

  it("denies an operation absent from that pairing's own allowlist", () => {
    expect(
      authorizePeerRoute([peerCx], [pairing], {
        ...request,
        operation: "snapshot.candidate.receive",
      }),
    ).toMatchObject({ error: { code: "operation-not-allowed" } });
    expect(
      authorizePeerRoute(
        [peerCx],
        [{ ...pairing, allowedOperations: [] }],
        request,
      ),
    ).toMatchObject({ error: { code: "operation-not-allowed" } });
  });

  it("denies an Epic this pairing does not bind", () => {
    // A Pairing binds exactly one Source Epic. An active PeerCX and an
    // allowed operation say nothing about which Epic may be exchanged, so the
    // gate itself has to refuse a substituted Epic.
    expect(
      authorizePeerRoute([peerCx], [pairing], {
        ...request,
        sourceEpicKey: "GREEN-2",
      }),
    ).toMatchObject({ error: { code: "epic-not-bound" } });
  });

  it("denies a pairing bound to the other role on this route", () => {
    expect(
      authorizePeerRoute([peerCx], [pairing], {
        ...request,
        role: "source",
      }),
    ).toMatchObject({ error: { code: "pairing-unauthorized" } });
  });
});
