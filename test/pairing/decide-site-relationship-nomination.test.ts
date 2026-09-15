import { describe, expect, it } from "vitest";

import {
  type DecideNominationCommand,
  decideSiteRelationshipNomination,
  type SiteRelationshipSetupState,
} from "../../src/pairing/site-relationship-nomination";

const blueIdentity = {
  environmentAri: "ari:cloud:ecosystem::environment/blue-development",
  installationAri: "ari:cloud:ecosystem::installation/blue-installation",
  siteAri: "ari:cloud:jira::site/blue-site",
} as const;

const terms = {
  allowedOperations: ["starter.delivery"] as const,
  expiresAt: "2026-09-21T12:00:00.000Z",
  termsVersion: "v1",
} as const;

const nominatedState = (): SiteRelationshipSetupState => ({
  nominations: [
    {
      correlationId: "correlation-001",
      counterpartSiteAri: blueIdentity.siteAri,
      idempotencyKey: "nominate-001",
      invitationReference: "reference-001",
      nominatedIdentity: blueIdentity,
      receiverEndpointStatus: "configured",
      relationshipId: "relationship-001",
      role: "green",
      status: "awaiting-green-approval",
      terms,
    },
  ],
  processedIdempotencyKeys: ["nominate-001"],
  relationships: [],
});

const approveCommand: DecideNominationCommand = {
  actor: "green-administrator",
  correlationId: "correlation-001",
  decidedAt: "2026-09-14T19:00:00.000Z",
  decision: "approve",
  idempotencyKey: "decision-001",
  reviewedIdentity: blueIdentity,
  reviewedReceiverEndpointStatus: "configured",
  reviewedTerms: terms,
};

describe("decideSiteRelationshipNomination", () => {
  it("approves exactly the reviewed Blue identity, endpoint status, scope, and expiry", () => {
    const result = decideSiteRelationshipNomination(
      nominatedState(),
      approveCommand,
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected the reviewed nomination to be approvable");
    }
    expect(result.value.outcome).toBe("awaiting-blue-confirmation");
    expect(result.value.nextState).toEqual({
      nominations: [
        {
          ...nominatedState().nominations[0],
          decidedAt: "2026-09-14T19:00:00.000Z",
          status: "awaiting-blue-confirmation",
        },
      ],
      processedIdempotencyKeys: ["nominate-001", "decision-001"],
      relationships: [],
    });
  });

  it("rejects a nomination with a safe reason code and grants no authority", () => {
    const result = decideSiteRelationshipNomination(nominatedState(), {
      ...approveCommand,
      decision: "reject",
      safeReason: "counterpart-not-expected",
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected the reviewed nomination to be rejectable");
    }
    expect(result.value.outcome).toBe("rejected");
    expect(result.value.nextState.nominations).toEqual([
      {
        ...nominatedState().nominations[0],
        decidedAt: "2026-09-14T19:00:00.000Z",
        safeReason: "counterpart-not-expected",
        status: "rejected",
      },
    ]);
  });

  it("refuses a rejection that records no safe reason", () => {
    const state = nominatedState();

    const result = decideSiteRelationshipNomination(state, {
      ...approveCommand,
      decision: "reject",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected a reasonless rejection to be refused");
    }
    expect(result.error).toEqual({ code: "safe-reason-required" });
    expect(state).toEqual(nominatedState());
  });

  it("leaves the invitation pending without granting authority or moving the expiry", () => {
    const result = decideSiteRelationshipNomination(nominatedState(), {
      ...approveCommand,
      decision: "leave-pending",
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected leaving the nomination pending to succeed");
    }
    expect(result.value.outcome).toBe("awaiting-green-approval");
    expect(result.value.nextState).toEqual(nominatedState());
  });

  it.each([
    [
      {
        reviewedIdentity: {
          ...blueIdentity,
          installationAri: "ari:cloud:ecosystem::installation/other",
        },
      },
      "the nominated installation changed",
    ],
    [
      {
        reviewedIdentity: {
          ...blueIdentity,
          siteAri: "ari:cloud:jira::site/other",
        },
      },
      "the nominated site changed",
    ],
    [
      {
        reviewedIdentity: {
          ...blueIdentity,
          environmentAri: "ari:cloud:ecosystem::environment/other",
        },
      },
      "the nominated environment changed",
    ],
    [
      { reviewedTerms: { ...terms, termsVersion: "v2" } },
      "the terms version changed",
    ],
    [
      {
        reviewedTerms: {
          ...terms,
          allowedOperations: ["starter.delivery", "candidate.cancel"],
        },
      },
      "the agreed scope changed",
    ],
    [
      { reviewedReceiverEndpointStatus: "not-configured" },
      "the endpoint status changed",
    ],
  ] as const)(
    "invalidates the pending decision when %s, requiring a new invitation",
    (override) => {
      const result = decideSiteRelationshipNomination(nominatedState(), {
        ...approveCommand,
        ...override,
      });

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        expect.unreachable("Expected a changed nomination to be invalidated");
      }
      expect(result.error.code).toBe("nomination-changed");
      if (result.error.code !== "nomination-changed") {
        expect.unreachable("Expected an invalidating error to carry state");
      }
      expect(result.error.nextState.nominations).toEqual([
        {
          ...nominatedState().nominations[0],
          decidedAt: "2026-09-14T19:00:00.000Z",
          status: "invalidated",
        },
      ]);
    },
  );
});
