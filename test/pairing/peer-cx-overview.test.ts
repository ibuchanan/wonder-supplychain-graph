import { describe, expect, it } from "vitest";

import { emptyLifecycleJournal } from "../../src/audit/lifecycle-journal";
import type {
  PeerCxNomination,
  PeerCxSetupState,
} from "../../src/pairing/peer-cx-nomination";
import { summarizeForAdministrator } from "../../src/pairing/peer-cx-overview";
import type { SourcePeerPairing } from "../../src/pairing/peer-pairing-state";

const now = "2026-09-15T12:00:00.000Z";

const terms = {
  allowedOperations: ["starter.delivery"],
  expiresAt: "2027-09-15T12:00:00.000Z",
  termsVersion: "v1",
} as const;

const nomination: PeerCxNomination = {
  correlationId: "correlation-001",
  counterpartSiteAri: "ari:cloud:jira::site/green-site",
  idempotencyKey: "correlation-001:nominate",
  invitationReference: "invitation-001",
  nominatedIdentity: {
    environmentAri: "ari:cloud:ecosystem::environment/blue-development",
    installationAri: "ari:cloud:ecosystem::installation/blue-installation",
    siteAri: "ari:cloud:jira::site/blue-site",
  },
  receiverEndpointStatus: "configured",
  peerCxId: "peer-cx-001",
  role: "blue",
  status: "active",
  terms,
};

const state: PeerCxSetupState = {
  nominations: [nomination],
  processedIdempotencyKeys: [],
  peerCxs: [
    {
      counterpartSiteAri: "ari:cloud:jira::site/green-site",
      leaseEndsAt: terms.expiresAt,
      peerCxId: "peer-cx-001",
      status: "active",
      termsVersion: "v1",
    },
  ],
};

const pairing: SourcePeerPairing = {
  allowedOperations: ["starter.delivery"],
  pairedEpicKey: "GREEN-1",
  pairingId: "pairing-001",
  peerEventUrl: "https://green.example/x1/abc123",
  peerCxId: "peer-cx-001",
  role: "source",
  sourceEpicKey: "BLUE-1",
  sourceSiteAri: "ari:cloud:jira::site/blue-site",
  sourceSiteUrl: "https://blue.example",
  status: "active",
};

describe("summarizeForAdministrator", () => {
  it("summarizes local status, counterpart, agreed scope, end instant, and pairing count", () => {
    const overview = summarizeForAdministrator({
      journal: emptyLifecycleJournal,
      now,
      pairings: [pairing],
      state,
    });

    expect(overview.peerCxs).toEqual([
      {
        agreedOperations: ["starter.delivery"],
        agreementEndsAt: terms.expiresAt,
        counterpartSiteAri: "ari:cloud:jira::site/green-site",
        pairingCount: 1,
        peerCxId: "peer-cx-001",
        status: "active",
        termsVersion: "v1",
      },
    ]);
  });

  it("shows a lapsed agreement as expired rather than active", () => {
    // The gate refuses a PeerCX past its agreement end instant whatever
    // the stored status says. A screen that still called it active would tell
    // the administrator the opposite of what the tenant will actually do.
    const overview = summarizeForAdministrator({
      journal: emptyLifecycleJournal,
      now: "2027-09-15T12:00:00.000Z",
      pairings: [pairing],
      state,
    });

    expect(overview.peerCxs[0]).toMatchObject({ status: "expired" });
  });

  it("counts only the pairings authorized under that PeerCX", () => {
    const overview = summarizeForAdministrator({
      journal: emptyLifecycleJournal,
      now,
      pairings: [
        pairing,
        { ...pairing, pairingId: "pairing-002", status: "inactive" },
        { ...pairing, pairingId: "pairing-003", peerCxId: "other" },
      ],
      state,
    });

    expect(overview.peerCxs[0]).toMatchObject({ pairingCount: 1 });
  });

  it("renders no secret, signature, endpoint, or Jira content", () => {
    // An administrator screen is permanent disclosure: whatever it renders is
    // in a browser, a screenshot, and a support ticket. The overview is built
    // beside a Pairing that holds the peer delivery endpoint, so this pins
    // down that the endpoint stays out of the view.
    const overview = summarizeForAdministrator({
      journal: {
        events: [
          {
            eventId: "audit:correlation-001:denied",
            eventType: "peer.authentication-failed",
            occurredAt: now,
            outcome: "denied",
            reason: "invalid-hmac-signature",
          },
        ],
      },
      now,
      pairings: [pairing],
      state,
    });

    expect(JSON.stringify(overview)).not.toContain(pairing.peerEventUrl);
    for (const forbidden of [
      "sha256=",
      "secret",
      "signature=",
      "x-webtrigger",
    ]) {
      expect(JSON.stringify(overview)).not.toContain(forbidden);
    }
  });
});
