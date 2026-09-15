import { describe, expect, it } from "vitest";

import { authorizePeerRoute } from "../../src/collaboration/peer-route-authorization";
import type { DestinationPeerPairing } from "../../src/pairing/peer-pairing-state";
import type { SiteRelationship } from "../../src/pairing/site-relationship";

const now = "2026-09-15T12:00:00.000Z";

const relationship: SiteRelationship = {
  counterpartSiteAri: "ari:cloud:jira::site/blue-site",
  leaseEndsAt: "2027-09-15T12:00:00.000Z",
  relationshipId: "relationship-001",
  status: "active",
  termsVersion: "v1",
};

const pairing: DestinationPeerPairing = {
  allowedOperations: ["starter.delivery"],
  automationWebhookUrl: "https://automation.example/webhook",
  connectionId: "connection-001",
  pairedEpicKey: "BLUE-1",
  pairingId: "pairing-001",
  relationshipId: "relationship-001",
  role: "destination",
  sourceEpicKey: "GREEN-1",
  status: "active",
};

const request = {
  counterpartSiteAri: relationship.counterpartSiteAri,
  now,
  operation: "starter.delivery",
  pairingId: "pairing-001",
  relationshipId: "relationship-001",
  role: "destination",
  sourceEpicKey: "GREEN-1",
} as const;

describe("authorizePeerRoute", () => {
  it("authorizes the exact active pairing under an in-lease relationship", () => {
    const authorized = authorizePeerRoute([relationship], [pairing], request);

    expect(authorized.isOk() && authorized.value.pairing).toBe(pairing);
  });

  it("denies a secret holder with no matching local relationship", () => {
    // A third installation sharing the development environment secret can
    // produce a valid signature. Possession is not a relationship.
    expect(authorizePeerRoute([], [pairing], request)).toMatchObject({
      error: { code: "relationship-unauthorized" },
    });
  });

  it("denies a revoked or expired relationship even with an active pairing", () => {
    for (const status of ["revoked", "expired", "pending", "failed"] as const) {
      expect(
        authorizePeerRoute([{ ...relationship, status }], [pairing], request),
      ).toMatchObject({ error: { code: "relationship-unauthorized" } });
    }

    expect(
      authorizePeerRoute(
        [{ ...relationship, leaseEndsAt: "2026-09-15T11:59:59.999Z" }],
        [pairing],
        request,
      ),
    ).toMatchObject({ error: { code: "relationship-unauthorized" } });
  });

  it("denies a counterpart or relationship the request does not actually name", () => {
    expect(
      authorizePeerRoute([relationship], [pairing], {
        ...request,
        counterpartSiteAri: "ari:cloud:jira::site/other-site",
      }),
    ).toMatchObject({ error: { code: "relationship-unauthorized" } });
    expect(
      authorizePeerRoute([relationship], [pairing], {
        ...request,
        relationshipId: "relationship-002",
      }),
    ).toMatchObject({ error: { code: "relationship-unauthorized" } });
  });

  it("denies a pairing that is inactive, unknown, or under another relationship", () => {
    // An active relationship is reusable across Pairings, so it cannot carry
    // authority for a Pairing that was never authorized under it.
    expect(
      authorizePeerRoute(
        [relationship],
        [{ ...pairing, status: "inactive" }],
        request,
      ),
    ).toMatchObject({ error: { code: "pairing-unauthorized" } });
    expect(authorizePeerRoute([relationship], [], request)).toMatchObject({
      error: { code: "pairing-unauthorized" },
    });
    expect(
      authorizePeerRoute(
        [relationship],
        [{ ...pairing, relationshipId: "relationship-002" }],
        request,
      ),
    ).toMatchObject({ error: { code: "pairing-unauthorized" } });
  });

  it("denies an operation absent from that pairing's own allowlist", () => {
    expect(
      authorizePeerRoute([relationship], [pairing], {
        ...request,
        operation: "snapshot.candidate.receive",
      }),
    ).toMatchObject({ error: { code: "operation-not-allowed" } });
    expect(
      authorizePeerRoute(
        [relationship],
        [{ ...pairing, allowedOperations: [] }],
        request,
      ),
    ).toMatchObject({ error: { code: "operation-not-allowed" } });
  });

  it("denies an Epic this pairing does not bind", () => {
    // A Pairing binds exactly one Source Epic. An active relationship and an
    // allowed operation say nothing about which Epic may be exchanged, so the
    // gate itself has to refuse a substituted Epic.
    expect(
      authorizePeerRoute([relationship], [pairing], {
        ...request,
        sourceEpicKey: "GREEN-2",
      }),
    ).toMatchObject({ error: { code: "epic-not-bound" } });
  });

  it("denies a pairing bound to the other role on this route", () => {
    expect(
      authorizePeerRoute([relationship], [pairing], {
        ...request,
        role: "source",
      }),
    ).toMatchObject({ error: { code: "pairing-unauthorized" } });
  });
});
