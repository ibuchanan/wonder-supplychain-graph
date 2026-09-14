import { describe, expect, it } from "vitest";

import { evaluateSiteRelationshipAuthorization } from "../../src/pairing/site-relationship";

describe("evaluateSiteRelationshipAuthorization", () => {
  it("authorizes a pairing only for its active relationship and current lease", () => {
    expect(
      evaluateSiteRelationshipAuthorization(
        {
          counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
          leaseEndsAt: "2026-09-15T00:00:00.000Z",
          relationshipId: "relationship-001",
          status: "active",
          termsVersion: "v1",
        },
        {
          counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
          now: "2026-09-14T18:00:00.000Z",
          relationshipId: "relationship-001",
        },
      ),
    ).toEqual({ authorized: true });
  });

  it.each([
    [undefined, "no relationship exists"],
    [
      {
        counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
        leaseEndsAt: "2026-09-15T00:00:00.000Z",
        relationshipId: "relationship-001",
        status: "pending",
        termsVersion: "v1",
      },
      "the relationship is pending",
    ],
    [
      {
        counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
        leaseEndsAt: "2026-09-15T00:00:00.000Z",
        relationshipId: "relationship-001",
        status: "revoked",
        termsVersion: "v1",
      },
      "the relationship is revoked",
    ],
    [
      {
        counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
        leaseEndsAt: "2026-09-15T00:00:00.000Z",
        relationshipId: "relationship-001",
        status: "expired",
        termsVersion: "v1",
      },
      "the relationship is expired",
    ],
    [
      {
        counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
        leaseEndsAt: "2026-09-15T00:00:00.000Z",
        relationshipId: "relationship-001",
        status: "failed",
        termsVersion: "v1",
      },
      "the relationship setup failed",
    ],
    [
      {
        counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
        leaseEndsAt: "2026-09-14T18:00:00.000Z",
        relationshipId: "relationship-001",
        status: "active",
        termsVersion: "v1",
      },
      "the lease has ended",
    ],
    [
      {
        counterpartSiteAri: "ari:cloud:jira::site/other-supplier-001",
        leaseEndsAt: "2026-09-15T00:00:00.000Z",
        relationshipId: "relationship-001",
        status: "active",
        termsVersion: "v1",
      },
      "the nominated counterpart differs",
    ],
    [
      {
        counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
        leaseEndsAt: "2026-09-15T00:00:00.000Z",
        relationshipId: "relationship-002",
        status: "active",
        termsVersion: "v1",
      },
      "the relationship differs",
    ],
  ] as const)("denies authorization when %s", (relationship) => {
    expect(
      evaluateSiteRelationshipAuthorization(relationship, {
        counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
        now: "2026-09-14T18:00:00.000Z",
        relationshipId: "relationship-001",
      }),
    ).toEqual({ authorized: false });
  });

  it("denies authorization when the lease timestamp is malformed", () => {
    expect(
      evaluateSiteRelationshipAuthorization(
        {
          counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
          leaseEndsAt: "not-a-timestamp",
          relationshipId: "relationship-001",
          status: "active",
          termsVersion: "v1",
        },
        {
          counterpartSiteAri: "ari:cloud:jira::site/supplier-001",
          now: "2026-09-14T18:00:00.000Z",
          relationshipId: "relationship-001",
        },
      ),
    ).toEqual({ authorized: false });
  });
});
