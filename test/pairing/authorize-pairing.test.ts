import { describe, expect, it } from "vitest";

import { authorizePairing } from "../../src/pairing/authorize-pairing";
import type { DestinationPeerPairing } from "../../src/pairing/peer-pairing-state";
import type {
  SiteRelationshipNomination,
  SiteRelationshipSetupState,
} from "../../src/pairing/site-relationship-nomination";

const terms = {
  allowedOperations: ["starter.delivery", "snapshot.candidate.receive"],
  expiresAt: "2027-09-15T12:00:00.000Z",
  termsVersion: "v1",
} as const;

const nomination: SiteRelationshipNomination = {
  correlationId: "correlation-001",
  counterpartSiteAri: "ari:cloud:jira::site/blue-site",
  idempotencyKey: "correlation-001:nominate",
  invitationReference: "invitation-001",
  nominatedIdentity: {
    environmentAri: "ari:cloud:ecosystem::environment/blue-development",
    installationAri: "ari:cloud:ecosystem::installation/blue-installation",
    siteAri: "ari:cloud:jira::site/blue-site",
  },
  receiverEndpointStatus: "configured",
  relationshipId: "relationship-001",
  role: "green",
  status: "active",
  terms,
};

const state: SiteRelationshipSetupState = {
  nominations: [nomination],
  processedIdempotencyKeys: [],
  relationships: [
    {
      counterpartSiteAri: "ari:cloud:jira::site/blue-site",
      leaseEndsAt: terms.expiresAt,
      relationshipId: "relationship-001",
      status: "active",
      termsVersion: "v1",
    },
  ],
};

const pairing: DestinationPeerPairing = {
  allowedOperations: [],
  automationWebhookUrl: "https://automation.example/webhook",
  connectionId: "connection-001",
  pairedEpicKey: "GREEN-1",
  pairingId: "pairing-001",
  relationshipId: "relationship-001",
  role: "destination",
  sourceEpicKey: "BLUE-1",
  status: "inactive",
};

const command = {
  actor: "local-administrator",
  allowedOperations: ["starter.delivery"],
  authorizedAt: "2026-09-15T12:00:00.000Z",
  correlationId: "correlation-001",
  pairing,
} as const;

describe("authorizePairing", () => {
  it("activates a pairing bound to one Source Epic, one Paired Epic, and an explicit allowlist", () => {
    const authorized = authorizePairing(state, { pairings: [] }, command);

    expect(authorized.isOk() && authorized.value.nextState.pairings).toEqual([
      {
        ...pairing,
        allowedOperations: ["starter.delivery"],
        status: "active",
      },
    ]);
  });

  it("refuses a pairing unless its relationship is active and in lease", () => {
    for (const status of ["revoked", "expired", "pending", "failed"] as const) {
      expect(
        authorizePairing(
          { ...state, relationships: [{ ...state.relationships[0]!, status }] },
          { pairings: [] },
          command,
        ),
      ).toMatchObject({ error: { code: "relationship-unauthorized" } });
    }

    expect(
      authorizePairing(
        state,
        { pairings: [] },
        {
          ...command,
          authorizedAt: terms.expiresAt,
        },
      ),
    ).toMatchObject({ error: { code: "relationship-unauthorized" } });
    expect(
      authorizePairing(
        { ...state, relationships: [] },
        { pairings: [] },
        command,
      ),
    ).toMatchObject({ error: { code: "relationship-unauthorized" } });
  });

  it("refuses an allowlist reaching past the agreed scope, and an empty one", () => {
    // An active relationship is a precondition, not a grant: it cannot widen
    // a Pairing beyond the scope the two sites actually consented to, and an
    // absent allowlist is a refusal rather than a permissive default.
    expect(
      authorizePairing(
        state,
        { pairings: [] },
        {
          ...command,
          allowedOperations: ["snapshot.candidate.deliver"],
        },
      ),
    ).toMatchObject({ error: { code: "operation-not-agreed" } });
    expect(
      authorizePairing(
        state,
        { pairings: [] },
        {
          ...command,
          allowedOperations: [],
        },
      ),
    ).toMatchObject({ error: { code: "operation-not-agreed" } });
  });

  it("refuses a pairing that does not bind both Epics", () => {
    // A Pairing is the bilateral relationship between exactly one Source Epic
    // and one Paired Epic. A half-bound Pairing would otherwise be activated
    // and then resolve its missing side from whatever arrived.
    for (const incomplete of [
      { ...pairing, pairedEpicKey: "" },
      { ...pairing, sourceEpicKey: "" },
    ]) {
      expect(
        authorizePairing(
          state,
          { pairings: [] },
          { ...command, pairing: incomplete },
        ),
      ).toMatchObject({ error: { code: "epic-binding-required" } });
    }
  });
});
