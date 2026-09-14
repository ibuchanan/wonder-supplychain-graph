export interface SiteRelationship {
  readonly counterpartSiteAri: string;
  readonly leaseEndsAt: string;
  readonly relationshipId: string;
  readonly status: "active" | "expired" | "failed" | "pending" | "revoked";
  readonly termsVersion: string;
}

export interface SiteRelationshipAuthorizationRequest {
  readonly counterpartSiteAri: string;
  readonly now: string;
  readonly relationshipId: string;
}

function isIsoInstant(value: string): boolean {
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
  );
}

export function evaluateSiteRelationshipAuthorization(
  relationship: SiteRelationship | undefined,
  request: SiteRelationshipAuthorizationRequest,
): { readonly authorized: boolean } {
  return {
    authorized:
      relationship !== undefined &&
      relationship.status === "active" &&
      relationship.relationshipId === request.relationshipId &&
      relationship.counterpartSiteAri === request.counterpartSiteAri &&
      isIsoInstant(relationship.leaseEndsAt) &&
      isIsoInstant(request.now) &&
      relationship.leaseEndsAt > request.now,
  };
}
