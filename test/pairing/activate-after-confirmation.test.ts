import { describe, expect, it } from "vitest";

import { activateAfterConfirmation } from "../../src/pairing/site-relationship-activation";
import type { SiteRelationshipSetupState } from "../../src/pairing/site-relationship-nomination";

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

const acceptedNomination = {
  acceptedAt: "2026-09-14T19:10:00.000Z",
  correlationId: "correlation-001",
  counterpartSiteAri: greenSiteAri,
  idempotencyKey: "nominate-001",
  invitationReference: "reference-001",
  nominatedIdentity: blueIdentity,
  receiverEndpointStatus: "configured",
  relationshipId: "relationship-001",
  role: "blue",
  status: "awaiting-blue-confirmation",
  terms,
} as const;

const blueState = (
  nomination: Record<string, unknown> = {},
): SiteRelationshipSetupState => ({
  nominations: [{ ...acceptedNomination, ...nomination }],
  processedIdempotencyKeys: ["nominate-001"],
  relationships: [],
});

const receipt = {
  correlationId: "correlation-001",
  outcome: "active",
  relationshipId: "relationship-001",
} as const;

const context = { now: "2026-09-14T19:10:02.000Z" };

describe("activateAfterConfirmation", () => {
  it("activates Blue's local relationship on the authenticated success receipt", () => {
    const result = activateAfterConfirmation(blueState(), receipt, context);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected an authenticated success to activate Blue");
    }
    expect(result.value.nextState).toEqual({
      nominations: [
        {
          ...acceptedNomination,
          confirmedAt: "2026-09-14T19:10:02.000Z",
          status: "active",
        },
      ],
      processedIdempotencyKeys: ["nominate-001"],
      relationships: [
        {
          counterpartSiteAri: greenSiteAri,
          leaseEndsAt: terms.expiresAt,
          relationshipId: "relationship-001",
          status: "active",
          termsVersion: "v1",
        },
      ],
    });
  });

  it("activates nothing when the receipt names another relationship", () => {
    const state = blueState();

    const result = activateAfterConfirmation(
      state,
      { ...receipt, relationshipId: "relationship-002" },
      context,
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected a mismatched receipt to be refused");
    }
    expect(result.error).toEqual({ code: "confirmation-mismatch" });
    expect(state).toEqual(blueState());
  });

  it("activates nothing for a correlation Blue never nominated", () => {
    const result = activateAfterConfirmation(
      blueState(),
      { ...receipt, correlationId: "correlation-002" },
      context,
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an unknown correlation to be refused");
    }
    expect(result.error).toEqual({ code: "pending-nomination-not-found" });
  });

  it("refuses to activate before Blue recorded its own acceptance", () => {
    const result = activateAfterConfirmation(
      blueState({ acceptedAt: undefined, status: "awaiting-green-approval" }),
      receipt,
      context,
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an unaccepted record to be refused");
    }
    expect(result.error).toEqual({ code: "acceptance-not-recorded" });
  });

  it("replays the recorded activation when the success receipt arrives twice", () => {
    const first = activateAfterConfirmation(blueState(), receipt, context);
    if (first.isErr()) {
      expect.unreachable("Expected the first receipt to activate Blue");
    }

    const second = activateAfterConfirmation(first.value.nextState, receipt, {
      now: "2026-09-14T19:11:00.000Z",
    });

    expect(second.isOk()).toBe(true);
    if (second.isErr()) {
      expect.unreachable("Expected a duplicate receipt to replay safely");
    }
    expect(second.value.nextState).toEqual(first.value.nextState);
    expect(second.value.relationship).toEqual(first.value.relationship);
  });
});
