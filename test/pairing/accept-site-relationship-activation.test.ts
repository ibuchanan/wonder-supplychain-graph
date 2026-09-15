import { describe, expect, it } from "vitest";

import {
  type ActivationProposal,
  acceptActivationProposal,
} from "../../src/pairing/site-relationship-activation";
import type {
  NominationStatus,
  SiteRelationshipSetupState,
} from "../../src/pairing/site-relationship-nomination";

const blueIdentity = {
  environmentAri: "ari:cloud:ecosystem::environment/blue-development",
  installationAri: "ari:cloud:ecosystem::installation/blue-installation",
  siteAri: "ari:cloud:jira::site/blue-site",
} as const;

const greenSiteAri = "ari:cloud:jira::site/green-site";

const terms = {
  allowedOperations: ["starter.delivery"] as const,
  expiresAt: "2026-09-21T12:00:00.000Z",
  termsVersion: "v1",
} as const;

const pendingBlueNomination = {
  correlationId: "correlation-001",
  counterpartSiteAri: greenSiteAri,
  idempotencyKey: "nominate-001",
  invitationReference: "reference-001",
  nominatedIdentity: blueIdentity,
  receiverEndpointStatus: "configured",
  relationshipId: "relationship-001",
  role: "blue",
  status: "awaiting-green-approval",
  terms,
} as const;

const blueState = (
  status: NominationStatus = "awaiting-green-approval",
): SiteRelationshipSetupState => ({
  nominations: [{ ...pendingBlueNomination, status }],
  processedIdempotencyKeys: ["nominate-001"],
  relationships: [],
});

const proposal: ActivationProposal = {
  approvedIdentity: blueIdentity,
  correlationId: "correlation-001",
  counterpartSiteAri: greenSiteAri,
  leaseEndsAt: terms.expiresAt,
  operation: "site-relationship.activation-proposal",
  protocolVersion: "v1",
  relationshipId: "relationship-001",
  termsVersion: "v1",
};

const context = {
  idempotencyKey: "correlation-001:confirm",
  localIdentity: blueIdentity,
  now: "2026-09-14T19:10:00.000Z",
  requestId: "confirm-request-001",
};

describe("acceptActivationProposal", () => {
  it("records local acceptance and signs a fresh confirmation for the matching proposal", () => {
    const result = acceptActivationProposal(blueState(), proposal, context);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected a matching proposal to be acceptable");
    }
    expect(result.value.nextState).toEqual({
      nominations: [
        {
          ...pendingBlueNomination,
          acceptedAt: "2026-09-14T19:10:00.000Z",
          status: "awaiting-blue-confirmation",
        },
      ],
      processedIdempotencyKeys: ["nominate-001"],
      relationships: [],
    });
    expect(result.value.confirmation).toEqual({
      confirmedIdentity: blueIdentity,
      correlationId: "correlation-001",
      createdAt: "2026-09-14T19:10:00.000Z",
      idempotencyKey: "correlation-001:confirm",
      intendedReceiverSiteAri: greenSiteAri,
      leaseEndsAt: terms.expiresAt,
      operation: "site-relationship.confirm",
      protocolVersion: "v1",
      relationshipId: "relationship-001",
      requestId: "confirm-request-001",
      termsVersion: "v1",
    });
  });

  it.each([
    {
      override: { relationshipId: "relationship-002" },
      reason: "the proposed relationship ID is not the one Blue nominated",
    },
    {
      override: { counterpartSiteAri: "ari:cloud:jira::site/other" },
      reason: "the proposal comes back for a different counterpart site",
    },
    {
      override: {
        approvedIdentity: {
          ...blueIdentity,
          installationAri: "ari:cloud:ecosystem::installation/other",
        },
      },
      reason: "Green approved an identity that is not this Blue installation",
    },
    {
      override: { termsVersion: "v2" },
      reason: "the immutable terms version changed",
    },
    {
      override: { leaseEndsAt: "2027-09-21T12:00:00.000Z" },
      reason: "the agreed end instant moved",
    },
  ] as const)(
    "refuses to accept and records nothing when $reason",
    ({ override }) => {
      const state = blueState();

      const result = acceptActivationProposal(
        state,
        { ...proposal, ...override },
        context,
      );

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        expect.unreachable("Expected a mismatched proposal to be refused");
      }
      expect(result.error).toEqual({ code: "activation-proposal-mismatch" });
      expect(state).toEqual(blueState());
    },
  );

  it("refuses a proposal for a correlation Blue never nominated", () => {
    const result = acceptActivationProposal(
      blueState(),
      { ...proposal, correlationId: "correlation-002" },
      context,
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an unknown correlation to be refused");
    }
    expect(result.error).toEqual({ code: "pending-nomination-not-found" });
  });

  it("keeps the first acceptance and reuses its idempotency key when Blue retries", () => {
    const first = acceptActivationProposal(blueState(), proposal, context);
    if (first.isErr()) {
      expect.unreachable("Expected the first acceptance to be recorded");
    }

    const retried = acceptActivationProposal(first.value.nextState, proposal, {
      ...context,
      now: "2026-09-14T19:12:00.000Z",
      requestId: "confirm-request-002",
    });

    expect(retried.isOk()).toBe(true);
    if (retried.isErr()) {
      expect.unreachable("Expected a lost response to be retried safely");
    }
    expect(retried.value.nextState).toEqual(first.value.nextState);
    expect(retried.value.confirmation).toEqual({
      ...first.value.confirmation,
      createdAt: "2026-09-14T19:12:00.000Z",
      requestId: "confirm-request-002",
    });
  });

  it("refuses to accept a proposal after the agreed end instant", () => {
    const result = acceptActivationProposal(blueState(), proposal, {
      ...context,
      now: terms.expiresAt,
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an expired lease to block acceptance");
    }
    expect(result.error).toEqual({ code: "lease-expired" });
  });
});
