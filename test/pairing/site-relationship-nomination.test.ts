import { describe, expect, it } from "vitest";

import {
  type NominateSiteRelationshipCommand,
  nominateSiteRelationship,
  type SiteRelationshipSetupState,
} from "../../src/pairing/site-relationship-nomination";

const emptyState = (): SiteRelationshipSetupState => ({
  nominations: [],
  processedIdempotencyKeys: [],
});

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

const nominateCommand: NominateSiteRelationshipCommand = {
  actor: "blue-administrator",
  consentedAt: "2026-09-14T18:00:00.000Z",
  correlationId: "correlation-001",
  idempotencyKey: "nominate-001",
  intendedReceiverSiteAri: "ari:cloud:jira::site/green-site",
  invitationReference: "reference-001",
  localIdentity: blueIdentity,
  localReadiness: "ready",
  operation: "site-relationship.nominate",
  receiverEndpointStatus: "configured",
  requestId: "request-001",
  terms,
};

describe("nominateSiteRelationship", () => {
  it("records Blue local consent as pending and builds an endpoint-free nomination request", () => {
    const result = nominateSiteRelationship(emptyState(), nominateCommand);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected a ready Blue site to nominate itself");
    }
    expect(result.value.nextState).toEqual({
      nominations: [
        {
          correlationId: "correlation-001",
          idempotencyKey: "nominate-001",
          invitationReference: "reference-001",
          nominatedIdentity: blueIdentity,
          receiverEndpointStatus: "configured",
          role: "blue",
          status: "awaiting-green-approval",
          terms,
        },
      ],
      processedIdempotencyKeys: ["nominate-001"],
    });
    expect(result.value.request).toEqual({
      correlationId: "correlation-001",
      createdAt: "2026-09-14T18:00:00.000Z",
      idempotencyKey: "nominate-001",
      intendedReceiverSiteAri: "ari:cloud:jira::site/green-site",
      invitationReference: "reference-001",
      nominatedIdentity: blueIdentity,
      operation: "site-relationship.nominate",
      protocolVersion: "v1",
      receiverEndpointStatus: "configured",
      requestId: "request-001",
      terms,
    });
  });

  it("refuses to nominate, and sends nothing, while local readiness is blocked", () => {
    const state = emptyState();

    const result = nominateSiteRelationship(state, {
      ...nominateCommand,
      localReadiness: "blocked",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected a blocked Blue site to refuse nomination");
    }
    expect(result.error).toEqual({ code: "local-readiness-blocked" });
    expect(state).toEqual(emptyState());
  });

  it("replays the recorded nomination when Blue resubmits the same consent", () => {
    const first = nominateSiteRelationship(emptyState(), nominateCommand);
    if (first.isErr()) {
      expect.unreachable("Expected the first nomination to be recorded");
    }

    const second = nominateSiteRelationship(
      first.value.nextState,
      nominateCommand,
    );

    expect(second.isOk()).toBe(true);
    if (second.isErr()) {
      expect.unreachable("Expected a duplicate nomination to replay safely");
    }
    expect(second.value.nextState).toEqual(first.value.nextState);
    expect(second.value.request).toEqual(first.value.request);
  });
});
