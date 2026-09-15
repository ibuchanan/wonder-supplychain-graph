import { describe, expect, it } from "vitest";

import {
  createInvitation,
  type InvitationWorkflowState,
} from "../../src/pairing/invitation-workflow";
import {
  type NominationRequest,
  receiveSiteRelationshipNomination,
  type SiteRelationshipSetupState,
} from "../../src/pairing/site-relationship-nomination";

const emptyState = (): SiteRelationshipSetupState => ({
  nominations: [],
  processedIdempotencyKeys: [],
  relationships: [],
});

const greenSiteAri = "ari:cloud:jira::site/green-site";

const blueIdentity = {
  environmentAri: "ari:cloud:ecosystem::environment/blue-development",
  installationAri: "ari:cloud:ecosystem::installation/blue-installation",
  siteAri: "ari:cloud:jira::site/blue-site",
} as const;

function invited(): {
  readonly invitations: InvitationWorkflowState;
  readonly request: NominationRequest;
} {
  const { invitation, nextState } = createInvitation(
    { invitations: [] },
    {
      allowedOperations: ["starter.delivery"],
      createdAt: "2026-09-14T12:00:00.000Z",
      greenNavigationUrl: "https://green.example/apps/peer-invitation",
      purpose: "Coordinate supplier delivery",
      recipientAccountId: "tina-green-account",
      termsVersion: "v1",
    },
    { randomUUID: () => "id-001" },
  );

  return {
    invitations: nextState,
    request: {
      correlationId: invitation.correlationId,
      createdAt: "2026-09-14T18:00:00.000Z",
      idempotencyKey: "nominate-001",
      intendedReceiverSiteAri: greenSiteAri,
      invitationReference: invitation.reference,
      nominatedIdentity: blueIdentity,
      operation: "site-relationship.nominate",
      protocolVersion: "v1",
      receiverEndpointStatus: "configured",
      relationshipId: "relationship-001",
      requestId: "request-001",
      terms: {
        allowedOperations: invitation.allowedOperations,
        expiresAt: invitation.expiresAt,
        termsVersion: invitation.termsVersion,
      },
    },
  };
}

describe("receiveSiteRelationshipNomination", () => {
  it("stores the nomination awaiting Green approval and returns no endpoint", () => {
    const { invitations, request } = invited();

    const result = receiveSiteRelationshipNomination(emptyState(), request, {
      invitations,
      localSiteAri: greenSiteAri,
      now: "2026-09-14T18:00:01.000Z",
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected a valid nomination to be recorded");
    }
    expect(result.value.nextState).toEqual({
      nominations: [
        {
          correlationId: request.correlationId,
          counterpartSiteAri: blueIdentity.siteAri,
          idempotencyKey: "nominate-001",
          invitationReference: request.invitationReference,
          nominatedIdentity: blueIdentity,
          receiverEndpointStatus: "configured",
          relationshipId: "relationship-001",
          role: "green",
          status: "awaiting-green-approval",
          terms: request.terms,
        },
      ],
      processedIdempotencyKeys: ["nominate-001"],
      relationships: [],
    });
    expect(result.value.receipt).toEqual({
      correlationId: request.correlationId,
      outcome: "awaiting-green-approval",
    });
  });

  it("denies a nomination addressed to another receiver", () => {
    const { invitations, request } = invited();
    const state = emptyState();

    const result = receiveSiteRelationshipNomination(
      state,
      { ...request, intendedReceiverSiteAri: "ari:cloud:jira::site/other" },
      {
        invitations,
        localSiteAri: greenSiteAri,
        now: "2026-09-14T18:00:01.000Z",
      },
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected a misaddressed nomination to be denied");
    }
    expect(result.error).toEqual({ code: "nomination-receiver-mismatch" });
    expect(state).toEqual(emptyState());
  });

  it("denies a nomination whose invitation Green never issued", () => {
    const { request } = invited();

    const result = receiveSiteRelationshipNomination(emptyState(), request, {
      invitations: { invitations: [] },
      localSiteAri: greenSiteAri,
      now: "2026-09-14T18:00:01.000Z",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an unknown invitation to be denied");
    }
    expect(result.error).toEqual({ code: "invitation-not-found" });
  });

  it("denies a nomination that did not come through the recipient-bound hand-off", () => {
    const { invitations, request } = invited();

    const result = receiveSiteRelationshipNomination(
      emptyState(),
      { ...request, correlationId: "guessed-correlation" },
      {
        invitations,
        localSiteAri: greenSiteAri,
        now: "2026-09-14T18:00:01.000Z",
      },
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an unbound correlation to be denied");
    }
    expect(result.error).toEqual({
      code: "nomination-correlation-mismatch",
    });
  });

  it("denies a nomination that arrives after the fixed setup deadline", () => {
    const { invitations, request } = invited();

    const result = receiveSiteRelationshipNomination(emptyState(), request, {
      invitations,
      localSiteAri: greenSiteAri,
      now: "2026-09-21T12:00:00.000Z",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an expired setup attempt to be denied");
    }
    expect(result.error).toEqual({ code: "invitation-expired" });
  });

  it.each([
    [
      { allowedOperations: ["starter.delivery", "candidate.cancel"] },
      "the proposed scope is wider than the invitation",
    ],
    [{ termsVersion: "v2" }, "the immutable terms version differs"],
    [{ expiresAt: "2027-09-21T12:00:00.000Z" }, "the expiry differs"],
  ] as const)("denies a nomination when %s", (termsOverride) => {
    const { invitations, request } = invited();

    const result = receiveSiteRelationshipNomination(
      emptyState(),
      { ...request, terms: { ...request.terms, ...termsOverride } },
      {
        invitations,
        localSiteAri: greenSiteAri,
        now: "2026-09-14T18:00:01.000Z",
      },
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected altered terms to be denied");
    }
    expect(result.error).toEqual({ code: "nomination-terms-mismatch" });
  });

  it("returns the already-recorded outcome when the same nomination is delivered twice", () => {
    const { invitations, request } = invited();
    const context = {
      invitations,
      localSiteAri: greenSiteAri,
      now: "2026-09-14T18:00:01.000Z",
    };
    const first = receiveSiteRelationshipNomination(
      emptyState(),
      request,
      context,
    );
    if (first.isErr()) {
      expect.unreachable("Expected the first delivery to be recorded");
    }

    const second = receiveSiteRelationshipNomination(
      first.value.nextState,
      { ...request, requestId: "request-002" },
      context,
    );

    expect(second.isOk()).toBe(true);
    if (second.isErr()) {
      expect.unreachable("Expected a duplicate delivery to replay safely");
    }
    expect(second.value.nextState).toEqual(first.value.nextState);
    expect(second.value.receipt).toEqual(first.value.receipt);
  });
});
